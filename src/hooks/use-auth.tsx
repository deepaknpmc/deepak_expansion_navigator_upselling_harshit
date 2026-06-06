import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { me, logout, type AuthUser } from "@/lib/auth.functions";

type AuthCtx = {
  session: { user: AuthUser } | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const meFn = useServerFn(me);
  const logoutFn = useServerFn(logout);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await meFn();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [meFn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: AuthCtx = {
    session: user ? { user } : null,
    user,
    loading,
    signOut: async () => {
      try {
        await logoutFn();
      } finally {
        setUser(null);
      }
    },
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallbackAuth: AuthCtx = {
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
};

export function useAuth() {
  return useContext(Ctx) ?? fallbackAuth;
}
