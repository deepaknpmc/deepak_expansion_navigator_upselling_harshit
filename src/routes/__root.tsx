import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, useNavigate,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CustomersProvider } from "@/store/customers";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">This route doesn't exist in the Expansion OS.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Back to Command Center</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MetalCloud — Expansion Command Center" },
      { name: "description", content: "Internal Expansion Intelligence Platform for MetalCloud — identify, prioritize and execute upselling opportunities across the installed base." },
      { property: "og:title", content: "MetalCloud — Expansion Command Center" },
      { property: "og:description", content: "Internal Expansion Intelligence Platform for MetalCloud — identify, prioritize and execute upselling opportunities across the installed base." },
      { name: "twitter:title", content: "MetalCloud — Expansion Command Center" },
      { name: "twitter:description", content: "Internal Expansion Intelligence Platform for MetalCloud — identify, prioritize and execute upselling opportunities across the installed base." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3bdb5e89-8ef1-4f0f-8938-f32a2c51d458/id-preview-bff69909--1df70d96-1249-449c-b2e8-8cd4aaf3cfca.lovable.app-1780178465316.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3bdb5e89-8ef1-4f0f-8938-f32a2c51d458/id-preview-bff69909--1df70d96-1249-449c-b2e8-8cd4aaf3cfca.lovable.app-1780178465316.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { location } = useRouterState();
  const navigate = useNavigate();
  const path = location.pathname;
  const isLogin = path === "/login";

  useEffect(() => {
    if (loading) return;
    if (!session && !isLogin) {
      navigate({ to: "/login", replace: true });
    }
  }, [session, loading, isLogin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-[12px] text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!session && !isLogin) return null;
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomersProvider>
          <AuthGuard>
            <Outlet />
          </AuthGuard>
          <Toaster theme="dark" position="bottom-right" />
        </CustomersProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
