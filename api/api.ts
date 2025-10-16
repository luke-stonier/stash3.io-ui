import express, {Application} from "express";
import bcrypt from "bcryptjs";
import jwt, {SignOptions} from "jsonwebtoken";
import path from "path";
import "reflect-metadata";
import dotenv from "dotenv";
import cors from "cors";
import {DataSource} from "typeorm";
import {User} from "./entities/User";
import {AuthRequest, RawRequest} from "./types/auth";
import {stash3RequireAuth} from "./middleware/auth";
import {AWSAccountRef} from "./entities/AWSAccountRef";
import stripeRouter from "./billing/stripe-controller";
import {UserPurchasePlan} from "./entities/UserBilling";
import billingRouter from "./billing/billing-controller";
import staticRouter from "./static-controller";
import {addMinutes, createRawToken, hashToken, isExpired} from "./helpers/passwordReset";
import {PasswordResetToken} from "./entities/PasswordResetToken";
import MailService, {MailMessageType} from './services/MailService';
import LoggingService from "./services/LoggingService";

if (process.env.NODE_ENV !== "production") {
    const customEnvPath = process.env.STASH3_ENV
        || path.join(process.cwd(), ".env");  // fallback to local .env
    dotenv.config({path: customEnvPath});
    console.log("[env] loaded from:", customEnvPath);
} else {
    console.log("[env] production mode");
}


const app: Application = express();
const mailService = new MailService();
const loggingService = new LoggingService();
(async () => {
    if (process.env.NODE_ENV !== "production") {
        console.log('[mail] test email (dev mode)');
        return;
    }
    await mailService.SendEmail('junk@stash3.io', MailMessageType.TEST);
})(); // warm up

const FRONTEND_URL = process.env.APP_URL ?? "https://stash3.io"; // used in email links
const TOKEN_TTL_MIN = 30; // token valid for 30 minutes

export const db = new DataSource({
    type: "postgres",
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    entities: [User, AWSAccountRef, UserPurchasePlan, PasswordResetToken],
    synchronize: true,   // ✅ dev-friendly. For prod, switch to migrations.
    logging: false
});

async function bootstrap() {
    await db.initialize();
    console.log("[db] connected to", db.options.database);
    
    const apiRouter = express.Router();

    type JwtUser = { sub: string; email: string };

    function signToken(payload: JwtUser, ttl: string = "12h") {
        const secret: jwt.Secret = process.env.JWT_SECRET as string; // ensure it's defined
        const options: SignOptions = { expiresIn: '1 week' }; // 12hr

        return jwt.sign(payload, secret, options);
    }

    /** REGISTER */
    apiRouter.post("/auth/register", async (req, res) => {
        const {email, password, passwordRepeat} = req.body || {};
        if (!email || !password || !passwordRepeat) return res.status(400).json({error: "Email & password required"});
        if (password !== passwordRepeat) return res.status(400).json({error: "Passwords do not match"});

        const repo = db.getRepository(User);
        const existing = await repo.findOne({where: {email}});
        if (existing) return res.status(409).json({error: "Email already registered"});

        const passwordHash = await bcrypt.hash(password, 12);
        const user = repo.create({email, passwordHash});
        await repo.save(user);

        const token = signToken({sub: user.id, email: user.email});
        
        console.log('[auth] new user registered:', email);
        await mailService.SendEmail(user.email, MailMessageType.WELCOME, [
            { key: "{{EMAIL}}", value: user.email }
        ]);
        await loggingService.UserRegister(user);
        
        res.json({token, user: {id: user.id, email: user.email}});
    });

    /** LOGIN */
    apiRouter.post("/auth/login", async (req, res) => {
        const {email, password} = req.body || {};
        const repo = db.getRepository(User);
        const user = await repo.findOne({where: {email}});
        if (!user) return res.status(401).json({error: "Invalid credentials"});

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({error: "Invalid credentials"});

        const token = signToken({sub: user.id, email: user.email});
        
        console.log('[auth] user logged in:', email);
        
        res.json({token, user: {id: user.id, email: user.email}});
    });

    /**
     * FORGOT PASSWORD
     * Always responds 200 with a generic message (no account enumeration).
     */
    apiRouter.post("/auth/forgot-password", async (req, res) => {
        const emailInput: unknown = req.body?.email;
        if (typeof emailInput !== "string" || !emailInput.trim()) {
            // Still generic
            return res.status(200).json({ ok: true });
        }

        const email = emailInput.trim().toLowerCase();
        const userRepo = db.getRepository(User);
        const prRepo = db.getRepository(PasswordResetToken);

        const user = await userRepo.findOne({ where: { email } });

        if (user) {
            // Invalidate old tokens (optional but recommended)
            await prRepo
                .createQueryBuilder()
                .update(PasswordResetToken)
                .set({ usedAt: () => "NOW()" })
                .where("userId = :userId AND usedAt IS NULL", { userId: user.id })
                .execute();

            // Create a new token
            const raw = createRawToken(32);
            const tokenHash = hashToken(raw);
            const token = prRepo.create({
                userId: user.id,
                tokenHash,
                expiresAt: addMinutes(new Date(), TOKEN_TTL_MIN),
                requestedIp: req.ip ?? null,
                requestedUa: req.get("user-agent") ?? null,
            });
            await prRepo.save(token);

            const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(raw)}`;
            
            await mailService.SendEmail(
                user.email,
                MailMessageType.PASSWORD_RESET,
                [
                    { key: "{{CODE}}", value: encodeURIComponent(raw) },
                    { key: "{{RESET_URL}}", value: resetUrl },
                    { key: "{{TTL_MINUTES}}", value: String(TOKEN_TTL_MIN) },
                ]
            );
            await loggingService.UserForgotPassword(user);

            console.log(`[auth] password reset requested for ${email} -> ${resetUrl}`);
        }

        // Generic response to avoid user enumeration
        return res.status(200).json({ ok: true });
    });

    /**
     * (Optional) VERIFY TOKEN — lets the client check token validity without submitting a new password
     */
    apiRouter.get("/auth/reset-password/verify", async (req, res) => {
        const raw = String(req.query.token ?? "");
        if (!raw) return res.status(400).json({ error: "Missing token" });

        const tokenHash = hashToken(raw);
        const prRepo = db.getRepository(PasswordResetToken);
        const token = await prRepo.findOne({ where: { tokenHash } });

        if (!token || token.usedAt || isExpired(token.expiresAt)) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }
        return res.json({ ok: true });
    });

    /**
     * RESET PASSWORD — consumes token, sets new password
     */
    apiRouter.post("/auth/reset-password", async (req, res) => {
        const { token: raw, password, passwordRepeat } = req.body ?? {};
        if (!raw || typeof raw !== "string") return res.status(400).json({ error: "Missing token" });
        if (!password || typeof password !== "string") return res.status(400).json({ error: "Missing password" });
        if (password !== passwordRepeat) return res.status(400).json({ error: "Passwords do not match" });
        if (Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ error: "Password too long" });
        if (password.length < 8) return res.status(400).json({ error: "Password too short" });

        const prRepo = db.getRepository(PasswordResetToken);
        const userRepo = db.getRepository(User);

        const tokenHash = hashToken(raw);
        const token = await prRepo.findOne({ where: { tokenHash } });

        if (!token || token.usedAt || isExpired(token.expiresAt)) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        const user = await userRepo.findOne({ where: { id: token.userId } });
        if (!user) {
            return res.status(400).json({ error: "Invalid token" });
        }

        // Update password
        const passwordHash = await bcrypt.hash(password, 12);
        user.passwordHash = passwordHash;
        await userRepo.save(user);

        // Mark token used and invalidate others
        token.usedAt = new Date();
        await prRepo.save(token);
        await prRepo
            .createQueryBuilder()
            .update(PasswordResetToken)
            .set({ usedAt: () => "NOW()" })
            .where("userId = :userId AND usedAt IS NULL", { userId: user.id })
            .execute();

        // Optional: notify the user that their password changed
        await mailService.SendEmail(
            user.email,
            MailMessageType.PASSWORD_CHANGED,
            [
                { key: "{{SUPPORT_URL}}", value: "https://stash3.io/support" }
            ]
        );
        await loggingService.UserResetPassword(user);

        console.log(`[auth] password reset succeeded for ${user.email}`);

        return res.json({ ok: true });
    });

    apiRouter.post("/auth/change-password", async (req: AuthRequest, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const { currentPassword, newPassword, newPasswordRepeat } = req.body ?? {};
            if (!currentPassword || !newPassword || !newPasswordRepeat) {
                return res.status(400).json({ error: "Current & new passwords are required" });
            }
            if (newPassword !== newPasswordRepeat) {
                return res.status(400).json({ error: "Passwords do not match" });
            }
            if (Buffer.byteLength(newPassword, "utf8") > 72) {
                return res.status(400).json({ error: "Password too long" });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ error: "Password too short" });
            }

            const repo = db.getRepository(User);
            const user = await repo.findOne({ where: { id: req.user.sub } });
            if (!user) return res.status(401).json({ error: "Unauthorized" });

            // Verify current password
            const ok = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!ok) return res.status(401).json({ error: "Invalid current password" });

            // Prevent reusing the same password
            const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
            if (sameAsOld) {
                return res.status(400).json({ error: "New password must be different from the current password" });
            }

            // Update password
            const newHash = await bcrypt.hash(newPassword, 12);
            user.passwordHash = newHash;
            await repo.save(user);
            
            await mailService.SendEmail(user.email, MailMessageType.PASSWORD_CHANGED, [
              { key: "{{SUPPORT_URL}}", value: "https://stash3.io/support" },
            ]);
            await loggingService.UserChangedPassword(user);

            // Note: if you use long-lived JWTs, consider rotating/invalidating elsewhere.
            console.log("[auth] password changed:", user.email);

            return res.json({ ok: true });
        } catch (err) {
            console.error("[auth] change-password error", err);
            return res.status(500).json({ error: "Something went wrong" });
        }
    });
    
    /** END */
    
    // AWS ACCOUNT REFS
    apiRouter.post("/accounts", async (req: AuthRequest, res) => {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
        const userRepo = db.getRepository(User);
        const user = await userRepo.findOne({ where: { id: req.user.sub } });
        
        if (!user) return res.status(401).json({error: "Unauthorized"});
        const { accountName } = req.body;
        if (!accountName) {
            return res.status(400).json({error: "Name is required"});
        }
        const repo = db.getRepository(AWSAccountRef);
        const existing = await repo.findOne({where: {userId: req.user.sub, name: accountName}});
        if (existing) {
            return res.status(409).json({error: "Account Name already exists"});
        }
        const accRef = repo.create({
            userId: req.user.sub,
            name: accountName,
            handle: accountName.toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, "")   // remove all non-alphanumeric, non-space, non-dash
                .replace(/\s+/g, "-")           // replace spaces with -
                .replace(/-+/g, "-")           // collapse multiple - into one
        });
        await repo.save(accRef);
        
        await loggingService.UserAddedAccount(user, accRef.handle);
        
        res.json(accRef);
    });
    
    apiRouter.get("/accounts", async (req: AuthRequest, res) => {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
        const userRepo = db.getRepository(User);
        const user = await userRepo.findOne({ where: { id: req.user.sub } });
        if (!user) return res.status(401).json({error: "Unauthorized"});
        
        const repo = db.getRepository(AWSAccountRef);
        const rows = await repo.find({where: {userId: req.user.sub}});
        res.json([...rows]);
    });
    
    apiRouter.delete("/accounts/:handle", async (req: AuthRequest, res) => {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
        const userRepo = db.getRepository(User);
        const user = await userRepo.findOne({ where: { id: req.user.sub } });
        if (!user) return res.status(401).json({error: "Unauthorized"});

        const { handle } = req.params;
        if (!handle) {
            return res.status(400).json({error: "Handle is required"});
        }
        const repo = db.getRepository(AWSAccountRef);
        const existing = await repo.findOne({where: {userId: req.user.sub, handle}});
        if (!existing) {
            return res.status(404).json({error: "Account not found"});
        }
        await repo.remove(existing);
        res.json({ok: true});
    });
    
    apiRouter.get("/version", (_req, res) => {
        res.json({version: process.env.STASH3_VERSION || "unknown", releaseDate: new Date('2025-10-16')});
    });
    
    
    // heartbeat
    apiRouter.get("/ping", (_req, res) => {
        console.log("[<3] Alive");
        res.json({pong: true});
    });

    // ui path
    const ui_build_path = path.join(__dirname, "/public-site");    
    // middlewares
    app.use(stash3RequireAuth);
    app.use(cors());
    app.use(express.static(ui_build_path, { index: false }));
    app.use(express.json({
        verify: (req: RawRequest, res, buf) => {
            if (req.url.indexOf('/stripe/webhooks') > -1) {
                req.rawBody = buf.toString();
            }
        },
    }));
    app.use("/api", apiRouter);
    app.use("/api/billing", billingRouter);
    app.use("/api/stripe", stripeRouter);
    app.use("/api/static", staticRouter);

    // --- SPA fallback: any route NOT starting with /api -> index.html ---
    app.get("*", (_req, _res) => {
        if (_req.path.indexOf("/api/") > -1) {
            _res.status(404);
            _res.send();
        } else {
            _res.status(200);
            if (_req.path === "/article") {
                _res.sendFile(`${ui_build_path}/article.html`);
            } else if (_req.path === "/sitemap" || _req.path === "/sitemap.xml") {
                _res.sendFile(`${ui_build_path}/sitemap.xml`);
            } else {
                // fallback (turn into spa at some point)
                _res.sendFile(`${ui_build_path}/index.html`);
            }
        }
    });


    // startup
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
        const actualPort = (server.address() as any).port;
        console.log("[api] started on port", actualPort);
        console.log("[ui] serving from:", ui_build_path);
    });
}


bootstrap().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});