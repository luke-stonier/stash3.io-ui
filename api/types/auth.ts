import { Request } from "express";

export type AuthUser = { sub: string; email: string };
export interface AuthRequest extends Request {
    user?: AuthUser;
}
