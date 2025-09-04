"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const customEnvPath = process.env.STASH3_ENV
    || path_1.default.join(process.cwd(), ".env"); // fallback to local .env
dotenv_1.default.config({ path: customEnvPath });
console.log("[env] loaded from:", customEnvPath);
const typeorm_1 = require("typeorm");
const User_1 = require("./entities/User");
const auth_1 = require("./middleware/auth");
const AWSAccountRef_1 = require("./entities/AWSAccountRef");
const stripe_controller_1 = __importDefault(require("./billing/stripe-controller"));
exports.db = new typeorm_1.DataSource({
    type: "postgres",
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    entities: [User_1.User, AWSAccountRef_1.AWSAccountRef],
    synchronize: true,
    logging: false
});
async function bootstrap() {
    await exports.db.initialize();
    console.log("[db] connected to", exports.db.options.database);
    const app = (0, express_1.default)();
    const apiRouter = express_1.default.Router();
    const PORT = process.env.SVC_PORT ? Number(process.env.SVC_PORT) : 3001;
    function signToken(payload, ttl = "12h") {
        const secret = process.env.JWT_SECRET; // ensure it's defined
        const options = { expiresIn: "12h" };
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    /** REGISTER */
    apiRouter.post("/auth/register", async (req, res) => {
        const { email, password, passwordRepeat } = req.body || {};
        if (!email || !password || !passwordRepeat)
            return res.status(400).json({ error: "Email & password required" });
        if (password !== passwordRepeat)
            return res.status(400).json({ error: "Passwords do not match" });
        const repo = exports.db.getRepository(User_1.User);
        const existing = await repo.findOne({ where: { email } });
        if (existing)
            return res.status(409).json({ error: "Email already registered" });
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = repo.create({ email, passwordHash });
        await repo.save(user);
        const token = signToken({ sub: user.id, email: user.email });
        console.log('[auth] new user registered:', email);
        res.json({ token, user: { id: user.id, email: user.email } });
    });
    /** LOGIN */
    apiRouter.post("/auth/login", async (req, res) => {
        const { email, password } = req.body || {};
        const repo = exports.db.getRepository(User_1.User);
        const user = await repo.findOne({ where: { email } });
        if (!user)
            return res.status(401).json({ error: "Invalid credentials" });
        const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: "Invalid credentials" });
        const token = signToken({ sub: user.id, email: user.email });
        console.log('[auth] user logged in:', email);
        res.json({ token, user: { id: user.id, email: user.email } });
    });
    // AWS ACCOUNT REFS
    apiRouter.post("/accounts", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { accountName } = req.body;
        if (!accountName) {
            return res.status(400).json({ error: "Name is required" });
        }
        const repo = exports.db.getRepository(AWSAccountRef_1.AWSAccountRef);
        const existing = await repo.findOne({ where: { userId: req.user.sub, name: accountName } });
        if (existing) {
            return res.status(409).json({ error: "Account Name already exists" });
        }
        const accRef = repo.create({
            userId: req.user.sub,
            name: accountName,
            handle: accountName.toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, "") // remove all non-alphanumeric, non-space, non-dash
                .replace(/\s+/g, "-") // replace spaces with -
                .replace(/-+/g, "-") // collapse multiple - into one
        });
        await repo.save(accRef);
        res.json(accRef);
    });
    apiRouter.get("/accounts", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const repo = exports.db.getRepository(AWSAccountRef_1.AWSAccountRef);
        const rows = await repo.find({ where: { userId: req.user.sub } });
        res.json([...rows]);
    });
    apiRouter.delete("/accounts/:handle", async (req, res) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { handle } = req.params;
        if (!handle) {
            return res.status(400).json({ error: "Handle is required" });
        }
        const repo = exports.db.getRepository(AWSAccountRef_1.AWSAccountRef);
        const existing = await repo.findOne({ where: { userId: req.user.sub, handle } });
        if (!existing) {
            return res.status(404).json({ error: "Account not found" });
        }
        await repo.remove(existing);
        res.json({ ok: true });
    });
    // heartbeat
    apiRouter.get("/ping", (_req, res) => {
        console.log("[<3] Alive");
        res.json({ pong: true });
    });
    // middlewares
    app.use(auth_1.stash3RequireAuth);
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use("/api", apiRouter);
    app.use("/api/billing", stripe_controller_1.default);
    // startup
    const server = app.listen(PORT, "127.0.0.1", () => {
        const actualPort = server.address().port;
        console.log("svc listening on", actualPort);
    });
}
bootstrap().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
