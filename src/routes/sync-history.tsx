import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, SectionHeader } from "@/components/ui/atoms";
import { listSyncRuns } from "@/lib/adoption.functions";
import {
  type SyncRun,
  downloadSyncSummary,
  downloadUnmatchedReport,
} from "@/components/settings/AdoptionSyncCard";
import { Download, ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";
import { toCSV, downloadFile } from "@/lib/csv";

export const Route = createFileRoute("/sync-history")({
  head: () => ({
    meta: [
      { title: "Sync History — MetalCloud" },
      { name: "description", content: "Audit log of adoption data sync runs." },
    ],
  }),
  component: SyncHistoryPage,
});

function SyncHistoryPage() {
  const listRuns = useServerFn(listSyncRuns);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { runs } = await listRuns();
        setRuns(runs as SyncRun[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [listRuns]);

  const exportAll = () => {
    const csv = toCSV(
      runs.map((r) => ({
        sync_date: new Date(r.run_at).toISOString(),
        user: r.user_email,
        file_name: r.file_name,
        source: r.source,
        total_processed: r.total_count,
        updated: r.updated_count,
        new: r.new_count,
        unmatched: r.unmatched_count,
      })),
      ["sync_date", "user", "file_name", "source", "total_processed", "updated", "new", "unmatched"],
    );
    downloadFile(`sync-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/settings" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-2">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Settings
            </Link>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Sync History</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Audit log of all adoption data syncs.</p>
          </div>
          <button
            onClick={exportAll}
            disabled={!runs.length}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-surface-raised disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export Full Log
          </button>
        </div>

        <Card className="p-0 overflow-hidden">
          <SectionHeader title={`${runs.length} sync runs`} sub="Click a row to expand and review unmatched names" />
          {loading ? (
            <div className="p-6 text-center text-[12px] text-muted-foreground">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-muted-foreground">No syncs yet. Run one from Settings → Adoption Sync.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-surface-raised text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-6"></th>
                    <th className="px-3 py-2">Sync Date</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">File Name</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Updated</th>
                    <th className="px-3 py-2 text-right">New</th>
                    <th className="px-3 py-2 text-right">Unmatched</th>
                    <th className="px-3 py-2 text-right">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const isOpen = open === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className="border-t border-border hover:bg-surface-raised/50 cursor-pointer"
                          onClick={() => setOpen(isOpen ? null : r.id)}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(r.run_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.user_email || "—"}</td>
                          <td className="px-3 py-2"><code className="text-[11px]">{r.file_name || "—"}</code></td>
                          <td className="px-3 py-2 text-right font-mono">{r.total_count}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-500">{r.updated_count}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-500">{r.new_count}</td>
                          <td className={`px-3 py-2 text-right font-mono ${r.unmatched_count ? "text-amber-500" : ""}`}>{r.unmatched_count}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => downloadSyncSummary(r)}
                                className="inline-flex items-center gap-1 h-6 px-1.5 rounded border border-border text-[10px] hover:bg-surface-raised"
                                title="Download sync summary"
                              >
                                <Download className="w-3 h-3" /> Summary
                              </button>
                              <button
                                onClick={() => downloadUnmatchedReport(r)}
                                disabled={r.unmatched_count === 0}
                                className="inline-flex items-center gap-1 h-6 px-1.5 rounded border border-border text-[10px] hover:bg-surface-raised disabled:opacity-40"
                                title="Download unmatched customers"
                              >
                                <Download className="w-3 h-3" /> Unmatched
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-surface-raised/30 border-t border-border">
                            <td></td>
                            <td colSpan={8} className="px-3 py-3">
                              {r.unmatched_count === 0 ? (
                                <div className="text-[11px] text-muted-foreground">All processed rows matched a customer.</div>
                              ) : (
                                <>
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Unmatched customer names ({r.unmatched_count})</div>
                                  <div className="max-h-48 overflow-auto rounded-md border border-border bg-surface p-2 text-[11px] font-mono">
                                    {r.unmatched_names.map((n) => (
                                      <div key={n} className="py-0.5">{n}</div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
