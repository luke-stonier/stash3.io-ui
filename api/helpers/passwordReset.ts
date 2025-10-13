// utils/passwordReset.ts
import crypto from "crypto";

export function createRawToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex"); // raw token for the link
}

export function hashToken(raw: string): string {
    return crypto.createHash("sha256").update(raw, "utf8").digest("hex"); // stored in DB
}

export function addMinutes(d: Date, minutes: number): Date {
    return new Date(d.getTime() + minutes * 60_000);
}

export function isExpired(d: Date): boolean {
    return d.getTime() < Date.now();
}
