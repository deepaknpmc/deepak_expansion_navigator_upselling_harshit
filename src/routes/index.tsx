import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users, TrendingUp, Sparkles, MapPin, Layers, UserPlus,
  ArrowUpRight, AlertCircle, ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { Card, Stat, SectionHeader, TierBadge, StatusBadge, TypeBadge } from "@/components/ui/atoms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — MetalCloud Expansion OS" },
      { name: "description", content: "CEO view of the expansion pipeline across the installed base." },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { customers } = useCustomers();
  const [period] = useState("This Month");

  const m = useMemo(() => {
    const totalPipeline = customers.reduce((s, c) => s + c.upsellValue, 0);
    const highConf = customers.filter((c) => c.confidence >= 65 && c.status !== "Won" && c.status !== "Lost");
    const siteVisit = customers.filter((c) => c.siteSurveyRequired);
    const replication = customers.filter((c) => c.expansionType === "Replication" || c.multiUnitOpportunity);
    const userExp = customers.filter((c) => c.expansionType === "User");
    return {
      totalPipeline, highConf, siteVisit, replication, userExp,
      highConfValue: highConf.reduce((s, c) => s + c.upsellValue, 0),
      siteVisitValue: siteVisit.reduce((s, c) => s + c.upsellValue, 0),
      replicationValue: replication.reduce((s, c) => s + c.upsellValue, 0),
      userValue: userExp.reduce((s, c) => s + c.upsellValue, 0),
    };
  }, [customers]);

  const topOpps = [...customers]
    .filter((c) => c.status !== "Won" && c.status !== "Lost")
    .sort((a, b) => b.upsellValue * b.confidence - a.upsellValue * a.confidence)
    .slice(0, 6);

  const urgent = customers
    .filter((c) => c.siteSurveyRequired && c.status !== "Won" && c.status !== "Lost")
    .slice(0, 5);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach((c) => map.set(c.expansionType, (map.get(c.expansionType) || 0) + c.upsellValue));
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries()).map(([k, v]) => ({ name: k, value: v, pct: total ? (v / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
  }, [customers]);

  const byState = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach((c) => map.set(c.state, (map.get(c.state) || 0) + c.upsellValue));
    return Array.from(map.entries()).map(([k, v]) => ({ state: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [customers]);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              Live — Expansion Intelligence
            </div>
            <h1 className="font-display text-[28px] font-semibold tracking-tight">Expansion Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Identify, prioritize and execute expansion opportunities across the installed base.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-md bg-surface border border-border text-[12px] font-medium">{period}</div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Stat label="Total Customers" value={customers.length} sub={`+8 this month`} icon={<Users className="w-4 h-4" />} accent="info" />
          <Stat label="Upsell Pipeline" value={<>₹{m.totalPipeline.toFixed(2)}<span className="text-base text-muted-foreground ml-1">Cr</span></>} sub="+18% vs last month" icon={<TrendingUp className="w-4 h-4" />} accent="primary" />
          <Stat label="High Confidence" value={<>₹{m.highConfValue.toFixed(2)}<span className="text-base text-muted-foreground ml-1">Cr</span></>} sub={`${m.highConf.length} opportunities`} icon={<Sparkles className="w-4 h-4" />} accent="accent" />
          <Stat label="Site Visit Candidates" value={m.siteVisit.length} sub={`₹${m.siteVisitValue.toFixed(2)} Cr potential`} icon={<MapPin className="w-4 h-4" />} accent="warning" />
          <Stat label="Replication" value={m.replication.length} sub={`₹${m.replicationValue.toFixed(2)} Cr potential`} icon={<Layers className="w-4 h-4" />} accent="info" />
          <Stat label="User Expansion" value={m.userExp.length} sub={`₹${m.userValue.toFixed(2)} Cr potential`} icon={<UserPlus className="w-4 h-4" />} accent="success" />
        </div>

        {/* Row 2: Pipeline + Top Opps + Urgent */}
        <div className="grid grid-cols-12 gap-3 mb-6">
          <Card className="col-span-12 lg:col-span-4 p-5">
            <SectionHeader title="Pipeline by Type" sub="Distribution of expansion value" />
            <div className="space-y-3">
              {byType.map((t, i) => (
                <div key={t.name}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="font-medium">{t.name}</span>
                    <span className="font-mono text-muted-foreground">₹{t.value.toFixed(2)} Cr</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${t.pct}%`,
                        background: i % 2 === 0
                          ? "linear-gradient(90deg, oklch(0.78 0.16 195), oklch(0.65 0.18 220))"
                          : "linear-gradient(90deg, oklch(0.65 0.18 280), oklch(0.7 0.18 250))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-5 p-5">
            <SectionHeader title="Top Expansion Opportunities" sub="Highest weighted pipeline value" action={
              <button className="text-[11px] text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
            } />
            <div className="space-y-1 -mx-2">
              {topOpps.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-2 py-2 rounded-md hover:bg-surface-raised transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <TierBadge tier={o.icpTier} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{o.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{o.nextBestPitch}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[12px] font-semibold">₹{o.upsellValue.toFixed(1)} L</span>
                    <span className="text-[11px] font-mono w-9 text-right text-success">{o.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-3 p-5">
            <SectionHeader title="Needs Attention" sub="Site visit & overdue" />
            <div className="space-y-2">
              {urgent.map((u) => (
                <div key={u.id} className="flex items-start gap-2 p-2 rounded-md border border-warning/20 bg-warning/5">
                  <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium truncate">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.nextStep}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Row 3: Revenue heatmap + Site Visit list */}
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-12 lg:col-span-5 p-5">
            <SectionHeader title="Revenue by State" sub="Geographic concentration of pipeline" />
            <div className="space-y-2.5">
              {byState.map((s, i) => {
                const max = byState[0].value;
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 truncate text-[11px] font-mono text-muted-foreground" title={s.state}>{s.state}</div>
                    <div className="flex-1 h-7 rounded bg-surface-raised relative overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${(s.value / max) * 100}%`,
                          background: `linear-gradient(90deg, oklch(0.78 0.16 195 / ${0.6 - i * 0.05}), oklch(0.65 0.18 280 / ${0.5 - i * 0.05}))`,
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium">
                        ₹{s.value.toFixed(2)} Cr
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-7 p-5">
            <SectionHeader title="Site Visit Candidates" sub="Customers flagged for in-person engagement" action={
              <button className="text-[11px] text-primary hover:underline flex items-center gap-1">Plan visits <ArrowUpRight className="w-3 h-3" /></button>
            } />
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-surface-raised text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Customer</th>
                    <th className="text-left px-3 py-2 font-medium">State</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-right px-3 py-2 font-medium">Value</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {m.siteVisit.slice(0, 7).map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-surface-raised/50">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{c.state}</td>
                      <td className="px-3 py-2"><TypeBadge type={c.expansionType} /></td>
                      <td className="px-3 py-2 text-right font-mono">₹{c.upsellValue.toFixed(1)} L</td>
                      <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
