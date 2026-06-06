import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Grid3x3, Target, Users, BarChart3,
  Bell, Search, Command, PanelLeftClose, PanelLeftOpen,
  Maximize2, Minimize2, LogOut,
} from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import logoCollapsed from "@/assets/logo-collapsed.png";
import logoExpanded from "@/assets/logo-expanded.png";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Command Center", icon: LayoutDashboard, exact: true },
  { to: "/matrix", label: "Upselling Matrix", icon: Grid3x3 },
  { to: "/opportunities", label: "Opportunities", icon: Target },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

type ShellCtx = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  focusMode: boolean;
  toggleFocusMode: () => void;
};

const ShellContext = createContext<ShellCtx | null>(null);
export const useAppShell = () => {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShell");
  return ctx;
};

const LS_COLLAPSED = "metalcloud_sidebar_collapsed_v1";
const LS_FOCUS = "metalcloud_focus_mode_v1";

const railW = 64; // collapsed rail width
const expandedW = 240; // hover/expanded overlay width

export function AppShell({ children }: { children?: ReactNode }) {
  const { location } = useRouterState();
  const path = location.pathname;
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const displayName = user?.name || user?.email || "Account";
  const initials =
    (user?.name
      ? user.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("")
      : (user?.email?.[0] ?? "?")
    ).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  useEffect(() => {
    try {
      const c = localStorage.getItem(LS_COLLAPSED);
      const f = localStorage.getItem(LS_FOCUS);
      if (c !== null) setCollapsed(c === "1");
      if (f !== null) setFocusMode(f === "1");
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) try { localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0"); } catch {} }, [collapsed, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(LS_FOCUS, focusMode ? "1" : "0"); } catch {} }, [focusMode, hydrated]);

  // Esc exits focus mode
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && focusMode) setFocusMode(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [focusMode]);

  const ctx: ShellCtx = {
    collapsed,
    toggleCollapsed: () => setCollapsed((v) => !v),
    focusMode,
    toggleFocusMode: () => setFocusMode((v) => !v),
  };

  return (
    <ShellContext.Provider value={ctx}>
      <div className="h-screen flex bg-background text-foreground overflow-hidden">
        {/* Sidebar — width is controlled ONLY by the collapse/expand button.
            No hover-expand; nav clicks just navigate. */}
        {!focusMode && (
          <aside
            className="shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-full transition-[width] duration-200 ease-out z-40 overflow-hidden"
            style={{ width: collapsed ? railW : expandedW }}
          >
            <div className={["pt-5 pb-6 flex items-center", collapsed ? "px-3 justify-center" : "px-5 justify-between"].join(" ")}>
              <Link to="/" className="flex items-center gap-2.5 min-w-0">
                <img
                  src={collapsed ? logoCollapsed : logoExpanded}
                  alt="MetalCloud"
                  className={collapsed ? "w-9 h-9 object-contain shrink-0" : "h-9 w-auto object-contain shrink-0"}
                />
                {!collapsed && (
                  <div className="leading-tight overflow-hidden whitespace-nowrap">
                    <div className="font-display font-semibold text-[15px] tracking-tight">MetalCloud</div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Expansion OS</div>
                  </div>
                )}
              </Link>
              {!collapsed && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>

            <nav className={["flex-1 space-y-0.5", collapsed ? "px-2" : "px-3"].join(" ")}>
              {nav.map((item) => {
                const active = item.exact ? path === item.to : path.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "flex items-center gap-3 rounded-md text-[13px] font-medium transition-all relative group",
                      collapsed ? "px-2.5 py-2 justify-center" : "px-3 py-2",
                      active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50",
                    ].join(" ")}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    {!collapsed && (
                      <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className={["border-t border-sidebar-border", collapsed ? "p-2" : "p-3"].join(" ")}>
              {collapsed ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setCollapsed(false)}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
                    title="Expand sidebar"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmLogout(true)}
                    title={`Sign out (${displayName})`}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-xs font-semibold text-primary-foreground"
                  >
                    {initials}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent/50">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium leading-tight truncate" title={displayName}>{displayName}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">MetalCloud</div>
                  </div>
                  <button
                    onClick={() => setConfirmLogout(true)}
                    title="Sign out"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {!focusMode && (
            <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center px-6 gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search customers, opportunities, pitches…"
                    className="w-full h-9 pl-9 pr-16 rounded-md bg-surface border border-border text-[13px] placeholder:text-muted-foreground focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ring/30"
                  />
                  <kbd className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                    <Command className="w-2.5 h-2.5" /> K
                  </kbd>
                </div>
              </div>
              <button
                onClick={() => setFocusMode(true)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors"
                title="Focus mode"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Focus
              </button>
              <button className="relative p-2 rounded-md hover:bg-surface transition-colors">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
              </button>
            </header>
          )}
          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="fixed top-3 right-3 z-50 flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium bg-surface border border-border text-foreground hover:bg-surface-raised shadow-lg"
              title="Exit focus mode (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Exit Focus
            </button>
          )}
          <div className="flex-1 min-w-0 overflow-auto">
            {children ?? <Outlet />}
          </div>
        </main>

        {/* Logout confirmation */}
        {confirmLogout && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmLogout(false)}
          >
            <div
              className="w-full max-w-sm mx-4 rounded-xl border border-border bg-surface p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-[15px] font-semibold">Sign out?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                You'll need to sign in again to access the workspace.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-surface-raised transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmLogout(false); void handleLogout(); }}
                  className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}
