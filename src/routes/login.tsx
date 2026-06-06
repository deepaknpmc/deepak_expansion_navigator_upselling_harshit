import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { login } from "@/lib/auth.functions";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MetalCloud" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const loginFn = useServerFn(login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginFn({ data: { email, password } });
      await refresh();
      toast.success("Welcome back");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-semibold text-lg leading-tight">MetalCloud</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Expansion OS</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="font-display text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-[12px] text-muted-foreground mb-5">
            Access the shared MetalCloud Expansion workspace.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-surface-raised border border-border text-[13px] focus:outline-none focus:border-border-strong"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-surface-raised border border-border text-[13px] focus:outline-none focus:border-border-strong"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
