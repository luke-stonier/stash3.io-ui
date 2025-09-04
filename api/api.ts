import express from "express";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import "reflect-metadata";
import dotenv from "dotenv";
import cors from "cors";

if (process.env.NODE_ENV !== "production") {
    const customEnvPath = process.env.STASH3_ENV
        || path.join(process.cwd(), ".env");  // fallback to local .env
    dotenv.config({path: customEnvPath});
    console.log("[env] loaded from:", customEnvPath);
} else {
    console.log("[env] production mode");
}

import { DataSource } from "typeorm";
import { User } from "./entities/User";
import {AuthRequest} from "./types/auth";
import {stash3RequireAuth} from "./middleware/auth";
import {AWSAccountRef} from "./entities/AWSAccountRef";
import stripeRouter from "./billing/stripe-controller";

export const db = new DataSource({
    type: "postgres",
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    entities: [User, AWSAccountRef],
    synchronize: true,   // ✅ dev-friendly. For prod, switch to migrations.
    logging: false
});

async function bootstrap() {
    await db.initialize();
    console.log("[db] connected to", db.options.database);

    const app = express();
    const apiRouter = express.Router();
    const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

    type JwtUser = { sub: string; email: string };

    function signToken(payload: JwtUser, ttl: string = "12h") {
        const secret: jwt.Secret = process.env.JWT_SECRET as string; // ensure it's defined
        const options: SignOptions = { expiresIn: "12h" };

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
    
    // AWS ACCOUNT REFS
    apiRouter.post("/accounts", async (req: AuthRequest, res) => {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
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
        res.json(accRef);
    });
    
    apiRouter.get("/accounts", async (req: AuthRequest, res) => {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
        const repo = db.getRepository(AWSAccountRef);
        const rows = await repo.find({where: {userId: req.user.sub}});
        res.json([...rows]);
    });
    
    apiRouter.delete("/accounts/:handle", async (req: AuthRequest, res) => {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
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
    
    
    // heartbeat
    apiRouter.get("/ping", (_req, res) => {
        console.log("[<3] Alive");
        res.json({pong: true});
    });

    
    // middlewares
    app.use(stash3RequireAuth);
    app.use(cors());
    app.use(express.json());
    app.use("/api", apiRouter);
    app.use("/api/billing", stripeRouter);


    // startup
    const server = app.listen(PORT, () => {
        const actualPort = (server.address() as any).port;
        console.log("api listening on", actualPort);
    });
}


bootstrap().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});