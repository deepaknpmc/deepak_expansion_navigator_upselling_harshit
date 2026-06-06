import { type ReactNode } from "react";
import type { ICPTier, OpportunityStatus, ExpansionType, ExpansionMotion } from "@/data/sample";

export function TierBadge({ tier }: { tier: ICPTier }) {
  const map = {
    A: "bg-success/15 text-success border-success/30",
    B: "bg-warning/15 text-warning border-warning/30",
    C: "bg-info/15 text-info border-info/30",
  } as const;
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${map[tier]}`}>
      {tier}
    </span>
  );
}

const statusStyles: Record<OpportunityStatus, string> = {
  Identified: "bg-muted text-muted-foreground border-border",
  Qualified: "bg-info/15 text-info border-info/30",
  "Discovery Scheduled": "bg-accent/15 text-accent border-accent/30",
  "Discussion Ongoing": "bg-primary/15 text-primary border-primary/30",
  "Proposal Shared": "bg-warning/15 text-warning border-warning/30",
  "PO Expected": "bg-success/20 text-success border-success/40",
  Won: "bg-success text-success-foreground border-success",
  Lost: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusStyles[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {status}
    </span>
  );
}

const typeStyles: Record<ExpansionType, string> = {
  Digital: "bg-info/10 text-info border-info/30",
  Operational: "bg-accent/10 text-accent border-accent/30",
  Strategic: "bg-primary/10 text-primary border-primary/30",
  Replication: "bg-warning/10 text-warning border-warning/30",
  User: "bg-success/10 text-success border-success/30",
  Hardware: "bg-muted text-muted-foreground border-border",
};

export function TypeBadge({ type }: { type: ExpansionType }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeStyles[type]}`}>
      {type}
    </span>
  );
}

const motionStyles: Record<ExpansionMotion, string> = {
  "Online Only": "bg-muted text-muted-foreground",
  "Discovery Call": "bg-info/10 text-info",
  Consultative: "bg-accent/10 text-accent",
  "Site Survey": "bg-warning/10 text-warning",
  "Enterprise Rollout": "bg-primary/10 text-primary",
};

export function MotionBadge({ motion }: { motion: ExpansionMotion }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${motionStyles[motion]}`}>
      {motion}
    </span>
  );
}

export function ExpansionPath({ path }: { path: string[] }) {
  if (!path?.length) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex items-center flex-wrap gap-1">
      {path.map((step, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-[10px] font-mono">
            {step}
          </span>
          {i < path.length - 1 && (
            <span className="text-muted-foreground text-[10px]">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function Stat({
  label, value, sub, accent, icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "primary" | "success" | "warning" | "info" | "accent";
  icon?: ReactNode;
}) {
  const accentMap = {
    primary: "from-primary/20 to-primary/0 text-primary",
    success: "from-success/20 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
    info: "from-info/20 to-info/0 text-info",
    accent: "from-accent/20 to-accent/0 text-accent",
  } as const;
  const c = accent ? accentMap[accent] : "from-muted/30 to-transparent text-muted-foreground";
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-border-strong transition-all cursor-pointer">
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-radial ${c.split(" ")[0]} ${c.split(" ")[1]} blur-2xl opacity-40 pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          {icon && <div className={c.split(" ")[2]}>{icon}</div>}
        </div>
        <div className="font-display text-2xl font-semibold tracking-tight">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>
        {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      {children}
    </div>
  );
}
