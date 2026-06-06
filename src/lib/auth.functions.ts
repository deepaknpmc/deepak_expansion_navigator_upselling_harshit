import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { getDb } from "@/integrations/mongo/client.server";
import { startSession, endSession, readSession } from "@/integrations/auth/session.server";

export type AuthUser = { email: string; name?: string };

const norm = (s: string) => (s ?? "").trim().toLowerCase();

/** Log in with email + password. Sets the session cookie on success. */
export const login = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => input)
  .handler(async ({ data }): Promise<{ user: AuthUser }> => {
    const email = norm(data.email);
    if (!email || !data.password) throw new Error("Email and password are required.");

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });
    if (!user || !user.passwordHash) throw new Error("Invalid email or password.");

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new Error("Invalid email or password.");

    startSession({ id: String(user._id), email: user.email, name: user.name });
    return { user: { email: user.email, name: user.name } };
  });

/** Clear the session cookie. */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  endSession();
  return { ok: true };
});

/** Return the current user (or null) from the session cookie. */
export const me = createServerFn({ method: "GET" }).handler(async (): Promise<{ user: AuthUser | null }> => {
  const claims = readSession();
  if (!claims) return { user: null };
  return { user: { email: claims.email, name: claims.name } };
});
