"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stash3RequireAuth = void 0;
const jwt = __importStar(require("jsonwebtoken"));
function stash3RequireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (token === null || token === undefined || token === '') {
        next();
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { sub: decoded.sub, email: decoded.email };
        next();
    }
    catch (er) {
        console.log(er);
        res.status(401).json({ error: "Invalid token" });
    }
}
exports.stash3RequireAuth = stash3RequireAuth;
