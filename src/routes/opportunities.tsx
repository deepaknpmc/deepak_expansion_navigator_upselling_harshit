import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { TierBadge } from "@/components/ui/atoms";
import { CustomerDrawer } from "@/components/customer/CustomerDrawer";
import { statuses, type OpportunityStatus } from "@/data/sample";
import { LayoutGrid, List } from "lucide-react";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — MetalCloud" },
      { name: "description", content: "Pipeline view of expansion opportunities across stages." },
    ],
  }),
  component: OppsPage,
});

const stageColor: Record<OpportunityStatus, string> = {
  Identified: "border-t-muted-foreground",
  Qualified: "border-t-info",
  "Discovery Scheduled": "border-t-accent",
  "Discussion Ongoing": "border-t-primary",
  "Proposal Shared": "border-t-warning",
  "PO Expected": "border-t-success",
  Won: "border-t-success",
  Lost: "border-t-destructive",
};

function OppsPage() {
  const { customers, setStatus } = useCustomers();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<OpportunityStatus, typeof customers> = {} as any;
    statuses.forEach((s) => (g[s] = []));
    customers.forEach((c) => g[c.status].push(c));
    return g;
  }, [customers]);

  const totalByStage = (s: OpportunityStatus) =>
    grouped[s].reduce((sum, c) => sum + c.upsellValue, 0);

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Opportunity Pipeline</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Drag cards across stages to update status.</p>
          </div>
          <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
            <button onClick={() => setView("kanban")} className={`h-8 px-3 rounded text-[12px] font-medium inline-flex items-center gap-1.5 ${view === "kanban" ? "bg-surface-raised text-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button onClick={() => setView("list")} className={`h-8 px-3 rounded text-[12px] font-medium inline-flex items-center gap-1.5 ${view === "list" ? "bg-surface-raised text-foreground" : "text-muted-foreground"}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>

        {view === "kanban" ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {statuses.map((s) => (
              <div
                key={s}
                className={`w-72 shrink-0 rounded-xl bg-card border border-border border-t-2 ${stageColor[s]} flex flex-col max-h-[calc(100vh-12rem)]`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (drag) { setStatus(drag, s); setDrag(null); } }}
              >
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">{s}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{grouped[s].length}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1">
                    ₹{totalByStage(s).toFixed(2)} L
                  </div>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {grouped[s].map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDrag(c.id)}
                      onClick={() => setOpenId(c.id)}
                      className="p-2.5 rounded-lg bg-surface-raised border border-border hover:border-border-strong cursor-grab active:cursor-grabbing transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="text-[12px] font-medium leading-tight">{c.name}</div>
                        <TierBadge tier={c.icpTier} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{c.nextBestPitch}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold">₹{c.upsellValue.toFixed(1)} L</span>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-[9px] font-semibold text-primary-foreground">
                          {c.owner.slice(0, 1)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {grouped[s].length === 0 && (
                    <div className="text-center text-[11px] text-muted-foreground py-6 border border-dashed border-border rounded-lg">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-raised text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-left px-3 py-2">Pitch</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Value</th>
                  <th className="text-right px-3 py-2">Conf.</th>
                  <th className="text-left px-3 py-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="border-t border-border hover:bg-surface-raised/50 cursor-pointer">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.nextBestPitch}</td>
                    <td className="px-3 py-2">{c.status}</td>
                    <td className="px-3 py-2 text-right font-mono">₹{c.upsellValue.toFixed(1)} L</td>
                    <td className="px-3 py-2 text-right font-mono">{c.confidence}%</td>
                    <td className="px-3 py-2">{c.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />
    </AppShell>
  );
}
