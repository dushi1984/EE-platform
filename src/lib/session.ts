import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const SESSION_COOKIE = "insci_session";
export const SESSION_HEADER = "x-session-token";
// Robust secret: ensure an empty env var string doesn't wipe the signing secret
const rawSecret = process.env.SESSION_SECRET;
const SECRET = rawSecret && rawSecret.trim().length > 0 ? rawSecret.trim() : "in-science-dev-secret-change-me-2026-portal";
const MAX_AGE = 60 * 60 * 24 * 30;

// Standard First-Party cookie (Lax, works over HTTP and HTTPS)
export const sessionCookieOptions = {
  httpOnly: true,
  path: "/",
  maxAge: MAX_AGE,
  sameSite: "lax" as const,
};

// Cross-Site fallback for embedded iframes (SameSite=None, Secure, Partitioned)
export const iframeCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  partitioned: true,
  path: "/",
  maxAge: MAX_AGE,
};

export const preferenceCookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(userId: number, sessionVersion = 0) {
  const payload = `${userId}.${sessionVersion}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): { userId: number; sessionVersion: number } | null {
  if (!token) return null;
  const clean = token.trim();
  const parts = clean.split(".");
  if (parts.length !== 4) return null;
  const [id, version, ts, sig] = parts;
  const expected = sign(`${id}.${version}.${ts}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return null;
  const userId = Number(id);
  const sessionVersion = Number(version);
  return Number.isInteger(userId) && Number.isInteger(sessionVersion) ? { userId, sessionVersion } : null;
}

export async function setSession(userId: number) {
  const store = await cookies();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("User not found");
  const token = createSessionToken(userId, user.sessionVersion);
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
  return token;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(SESSION_COOKIE + "_p");
}

export const getCurrentUser = cache(async () => {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerToken = headerStore.get(SESSION_HEADER);
  const cookieToken = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(SESSION_COOKIE + "_p")?.value;
  const token = headerToken || cookieToken;

  const parsed = verifySessionToken(token);
  if (!parsed) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, parsed.userId) });
  if (!user || user.sessionVersion !== parsed.sessionVersion) return null;
  return user;
});

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

export function generateQrToken() {
  return randomBytes(12).toString("base64url");
}

export async function sessionPath(path: string) {
  const headerStore = await headers();
  const token = headerStore.get(SESSION_HEADER);
  if (!token || path.includes("session=")) return path;
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}session=${encodeURIComponent(token)}${hash}`;
}

export async function authRedirect(path: string): Promise<never> {
  const target = await sessionPath(path);
  redirect(target);
}
