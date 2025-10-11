import { Request } from "express";

export type AuthUser = { sub: string; email: string };
export interface AuthRequest extends Request {
    user?: AuthUser;
}

export interface RawRequest extends Request {
    rawBody?: string;
    bufferBody?: Buffer
}