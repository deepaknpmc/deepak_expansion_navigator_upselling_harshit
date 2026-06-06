// Server-only session handling: a signed (HMAC-SHA256) token stored in an
// httpOnly cookie. No external JWT library needed.
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE = "en_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionClaims = { sub: string; email: string; name?: string; exp: number };

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Missing/weak AUTH_SECRET environment variable (set a long random string).");
  }
  return s;
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64url");

function sign(claims: SessionClaims): string {
  const body = b64url(JSON.stringify(claims));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string | undefined): SessionClaims | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function startSession(user: { id: string; email: string; name?: string }) {
  const claims: SessionClaims = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  setCookie(COOKIE, sign(claims), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function endSession() {
  deleteCookie(COOKIE, { path: "/" });
}

export function readSession(): SessionClaims | null {
  return verify(getCookie(COOKIE));
}

