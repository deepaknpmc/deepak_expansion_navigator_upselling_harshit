import { createContext, useContext, type ReactNode } from "react";

// Auth has been removed — this is now an open internal tool backed by MongoDB.
// This stub keeps the existing AuthProvider / useAuth API so the rest of the
// app (store, settings, root guard) works unchanged. `session` is always
// present so data loads immediately and no login redirect ever fires.
//
// To add real sign-in later (e.g. Google OAuth), replace this file and the
// guard in src/routes/__root.tsx.

type StubUser = { email: string } | null;

type AuthCtx = {
  session: { authenticated: true } | null;
  user: StubUser;
  loading: boolean;
  signOut: () => Promise<void>;
};

const value: AuthCtx = {
  session: { authenticated: true },
  user: null,
  loading: false,
  signOut: async () => {},
};

const Ctx = createContext<AuthCtx>(value);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
