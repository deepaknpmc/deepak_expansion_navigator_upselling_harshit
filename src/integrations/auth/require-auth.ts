import { createMiddleware } from "@tanstack/react-start";

// Middleware references are retained in BOTH the client and server bundles (only
// `.handler()` bodies are stripped from the client). So this module's top-level
// imports must stay browser-safe — the session logic (which uses node:crypto) is
// loaded via a dynamic import inside the server-only callback, keeping it out of
// the client bundle entirely.
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { readSession } = await import("./session.server");
  const claims = readSession();
  if (!claims) throw new Error("Unauthorized");
  return next({ context: { userId: claims.sub, email: claims.email } });
});
