import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { TierBadge, StatusBadge } from "@/components/ui/atoms";
import { CustomerDrawer } from "@/components/customer/CustomerDrawer";
import { Search } from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — MetalCloud" },
      { name: "description", content: "Customer directory with segmentation and profiles." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers } = useCustomers();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => customers.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (tier !== "All" && c.icpTier !== tier) return false;
    return true;
  }), [customers, q, tier]);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Customer Directory</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{customers.length} customers across the installed base</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-border text-[13px] focus:outline-none focus:border-border-strong" />
          </div>
          <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
            {["All", "A", "B", "C"].map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`h-8 px-3 rounded text-[12px] font-medium ${tier === t ? "bg-surface-raised text-foreground" : "text-muted-foreground"}`}>
                {t === "All" ? "All tiers" : `Tier ${t}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              className="text-left p-4 rounded-xl border border-border bg-card hover:border-border-strong hover:bg-surface transition-all group flex flex-col h-[180px]"
            >
              {/* Header (fixed) */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-[14px] truncate group-hover:text-primary transition-colors">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate" title={`${c.cluster} · ${c.state} · ${c.castingType}`}>{c.cluster} · {c.state} · {c.castingType}</div>
                </div>
                <TierBadge tier={c.icpTier} />
              </div>
              {/* Body */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Mini label="Turnover" v={`₹${c.turnover}Cr`} />
                <Mini label="Units" v={String(c.units)} />
                <Mini label="Adoption" v={`${c.adoption}%`} />
              </div>
              {/* Footer (pinned to bottom) */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</div>
                  <div className="font-mono text-[14px] font-semibold">₹{c.upsellValue.toFixed(1)} L</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />
    </AppShell>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-[12px] font-medium">{v}</div>
    </div>
  );
}
