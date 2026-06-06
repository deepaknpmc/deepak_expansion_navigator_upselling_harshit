import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { TierBadge, StatusBadge } from "@/components/ui/atoms";
import { CustomerDrawer } from "@/components/customer/CustomerDrawer";
import { Search, ChevronDown } from "lucide-react";
import type { Customer } from "@/data/sample";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — MetalCloud" },
      { name: "description", content: "Customer directory with segmentation and profiles." },
    ],
  }),
  component: CustomersPage,
});

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();

function CustomersPage() {
  const { customers } = useCustomers();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("All");
  const [stateF, setStateF] = useState("All");
  const [clusterF, setClusterF] = useState("All");
  const [pocF, setPocF] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ recent: true, thisMonth: true, older: true });

  const opts = useMemo(() => ({
    states: uniq(customers.map((c) => c.state)),
    clusters: uniq(customers.map((c) => c.cluster)),
    pocs: uniq(customers.map((c) => c.salesPoc)),
  }), [customers]);

  const filtered = useMemo(() => customers.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (tier !== "All" && c.icpTier !== tier) return false;
    if (stateF !== "All" && c.state !== stateF) return false;
    if (clusterF !== "All" && c.cluster !== clusterF) return false;
    if (pocF !== "All" && c.salesPoc !== pocF) return false;
    return true;
  }), [customers, q, tier, stateF, clusterF, pocF]);

  // Bucket each card into exactly one section by when its status last changed.
  const sections = useMemo(() => {
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recent: Customer[] = [], thisMonth: Customer[] = [], older: Customer[] = [];
    for (const c of filtered) {
      const t = c.statusChangedAt ? Date.parse(c.statusChangedAt) : NaN;
      if (!Number.isNaN(t) && t >= sevenDaysAgo && c.status !== "Qualified") recent.push(c);
      else if (!Number.isNaN(t) && t >= startOfMonth) thisMonth.push(c);
      else older.push(c);
    }
    return [
      { key: "recent", title: "Recent Updates", sub: "Status changed in the last 7 days (excl. Qualified)", items: recent },
      { key: "thisMonth", title: "This Month", sub: "Status updated earlier this month", items: thisMonth },
      { key: "older", title: "Previous Month & Later", sub: "No recent status change", items: older },
    ];
  }, [filtered]);

  const filtersActive = tier !== "All" || stateF !== "All" || clusterF !== "All" || pocF !== "All" || q !== "";

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Customer Directory</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {filtered.length} of {customers.length} customers
              {filtersActive ? " (filtered)" : " across the installed base"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative w-64">
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
          <FilterSelect label="State" value={stateF} onChange={setStateF} options={opts.states} />
          <FilterSelect label="Cluster" value={clusterF} onChange={setClusterF} options={opts.clusters} />
          <FilterSelect label="Sales POC" value={pocF} onChange={setPocF} options={opts.pocs} />
          {filtersActive && (
            <button
              onClick={() => { setQ(""); setTier("All"); setStateF("All"); setClusterF("All"); setPocF("All"); }}
              className="h-9 px-3 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-raised"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sections — empty sections are hidden entirely. */}
        <div className="space-y-4">
          {sections.filter((s) => s.items.length > 0).map((s) => {
            const isOpen = open[s.key];
            return (
              <div key={s.key} className="rounded-xl border border-border bg-surface/40">
                <button
                  onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors hover:bg-surface-raised/50"
                >
                  <div className="flex items-center gap-2.5">
                    <ChevronDown className={["w-4 h-4 text-muted-foreground transition-transform", isOpen ? "" : "-rotate-90"].join(" ")} />
                    <div>
                      <div className="text-[13px] font-semibold">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground">{s.sub}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-raised border border-border text-muted-foreground">
                    {s.items.length}
                  </span>
                </button>
                {isOpen && (
                  <div className="p-4 pt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {s.items.map((c) => <CustomerCard key={c.id} c={c} onClick={() => setOpenId(c.id)} />)}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-[13px] text-muted-foreground py-10">No customers match these filters.</div>
          )}
        </div>
      </div>

      <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />
    </AppShell>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 pl-3 pr-8 rounded-md border text-[12px] appearance-none cursor-pointer focus:outline-none focus:border-border-strong ${value !== "All" ? "border-primary/50 bg-primary/5 text-foreground" : "border-border bg-surface text-muted-foreground"}`}
      >
        <option value="All">{`All ${label}`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function CustomerCard({ c, onClick }: { c: Customer; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
      {/* Footer (pinned) */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</div>
          <div className="font-mono text-[14px] font-semibold">₹{c.upsellValue.toFixed(1)} L</div>
        </div>
        <StatusBadge status={c.status} />
      </div>
    </button>
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
