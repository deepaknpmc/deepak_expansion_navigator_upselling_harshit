import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// Auth has been removed (open internal tool). This route now just bounces
// to the home page so any old /login links keep working.
export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "MetalCloud" }] }),
  component: LoginRedirect,
});

function LoginRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-[12px] text-muted-foreground">Redirecting…</div>
    </div>
  );
}
