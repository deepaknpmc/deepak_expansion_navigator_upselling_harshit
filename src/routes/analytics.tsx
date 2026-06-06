import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { Card, SectionHeader } from "@/components/ui/atoms";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MetalCloud" },
      { name: "description", content: "Lightweight expansion analytics." },
    ],
  }),
  component: AnalyticsPage,
});

function bar(value: number, max: number) {
  return Math.max(2, (value / Math.max(1, max)) * 100);
}

function AnalyticsPage() {
  const { customers } = useCustomers();

  const groupSum = (k: "expansionType" | "state" | "icpTier") => {
    const m = new Map<string, number>();
    customers.forEach((c) => m.set(c[k] as string, (m.get(c[k] as string) || 0) + c.upsellValue));
    return Array.from(m.entries()).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
  };

  const byType = useMemo(() => groupSum("expansionType"), [customers]);
  const byState = useMemo(() => groupSum("state"), [customers]);
  const byTier = useMemo(() => groupSum("icpTier"), [customers]);

  const siteVisit = customers.filter((c) => c.siteSurveyRequired);
  const replication = customers.filter((c) => c.multiUnitOpportunity);
  const userExp = customers.filter((c) => c.expansionType === "User");

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">High-signal views of the expansion pipeline.</p>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-12 lg:col-span-6 p-5">
            <SectionHeader title="Pipeline by Expansion Type" sub="Value distribution (₹ Lakhs)" />
            <Bars data={byType} />
          </Card>

          <Card className="col-span-12 lg:col-span-6 p-5">
            <SectionHeader title="Pipeline by State" />
            <Bars data={byState} accent="accent" />
          </Card>

          <Card className="col-span-12 lg:col-span-4 p-5">
            <SectionHeader title="Pipeline by ICP Tier" />
            <Bars data={byTier} accent="success" />
          </Card>

          <Card className="col-span-12 lg:col-span-4 p-5">
            <SectionHeader title="Site Visit Candidates" sub={`${siteVisit.length} customers`} />
            <List items={siteVisit.slice(0, 6).map((c) => ({ name: c.name, value: c.upsellValue }))} />
          </Card>

          <Card className="col-span-12 lg:col-span-4 p-5">
            <SectionHeader title="Replication Opportunities" sub={`${replication.length} multi-unit accounts`} />
            <List items={replication.slice(0, 6).map((c) => ({ name: c.name, value: c.upsellValue }))} />
          </Card>

          <Card className="col-span-12 p-5">
            <SectionHeader title="User Expansion Pipeline" sub={`${userExp.length} accounts targeted for seat growth`} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {userExp.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-surface-raised border border-border">
                  <div className="text-[12px] font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.userLite} Lite / {c.userPro} Pro</div>
                  <div className="font-mono text-[13px] font-semibold mt-2">₹{c.upsellValue.toFixed(1)} L</div>
                </div>
              ))}
              {userExp.length === 0 && <div className="text-[12px] text-muted-foreground col-span-4 text-center py-4">No user-expansion plays right now.</div>}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Bars({ data, accent = "primary" }: { data: { name: string; value: number }[]; accent?: "primary" | "accent" | "success" }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const colors = {
    primary: "linear-gradient(90deg, oklch(0.78 0.16 195), oklch(0.65 0.18 220))",
    accent: "linear-gradient(90deg, oklch(0.65 0.18 280), oklch(0.7 0.18 250))",
    success: "linear-gradient(90deg, oklch(0.72 0.17 155), oklch(0.78 0.16 195))",
  };
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="w-20 text-[11px] truncate font-mono text-muted-foreground">{d.name}</div>
          <div className="flex-1 h-6 rounded bg-surface-raised relative overflow-hidden">
            <div className="h-full rounded" style={{ width: `${bar(d.value, max)}%`, background: colors[accent] }} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium">₹{d.value.toFixed(2)} L</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function List({ items }: { items: { name: string; value: number }[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <div key={i.name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
          <span className="text-[12px] truncate">{i.name}</span>
          <span className="font-mono text-[11px] font-medium">₹{i.value.toFixed(1)} L</span>
        </div>
      ))}
    </div>
  );
}
