// api/middleware/auth.ts
import { Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AuthRequest, AuthUser } from "../types/auth";

export function stash3RequireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    
    if (token === null || token === undefined || token === '') {
        next();
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload & AuthUser;
        req.user = { sub: decoded.sub as string, email: (decoded as any).email as string };
        next();
    } catch(er) {
        console.log(er)
        res.status(401).json({ error: "Invalid token" });
    }
}
