import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, SectionHeader } from "@/components/ui/atoms";
import { Upload, RefreshCcw, CheckCircle2, AlertTriangle, Download, History } from "lucide-react";
import {
  uploadAdoptionRecords,
  syncAdoptionData,
  getLastSyncRun,
  type AdoptionRow,
} from "@/lib/adoption.functions";
import { useCustomers } from "@/store/customers";
import { toCSV, downloadFile } from "@/lib/csv";

export type SyncRun = {
  id: string;
  run_at: string;
  source: string;
  user_email: string;
  file_name: string;
  total_count: number;
  updated_count: number;
  new_count: number;
  unmatched_count: number;
  unmatched_names: string[];
};

const HEADER_MAP: Record<string, keyof AdoptionRow> = {
  "customer name": "customer_name",
  name: "customer_name",
  "adoption %": "adoption",
  "adoption%": "adoption",
  adoption: "adoption",
  "no modules": "no_modules",
  "no. modules": "no_modules",
  "no_modules": "no_modules",
  modules: "no_modules",
  "current systems": "current_systems",
  "adoption poc": "adoption_poc",
  "sales poc": "sales_poc",
  "customer age": "customer_age",
  age: "customer_age",
  cluster: "cluster",
  state: "state",
};

function parseCSV(text: string): AdoptionRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: AdoptionRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = parseLine(lines[li]);
    const row: AdoptionRow = { customer_name: "" };
    headers.forEach((h, i) => {
      const key = HEADER_MAP[h];
      if (!key) return;
      const raw = (cols[i] ?? "").trim();
      if (key === "current_systems") {
        row.current_systems = raw
          ? raw.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
          : [];
      } else if (key === "adoption" || key === "no_modules" || key === "customer_age") {
        const n = Number(raw.replace(/[%,]/g, ""));
        (row as any)[key] = Number.isFinite(n) ? n : 0;
      } else {
        (row as any)[key] = raw;
      }
    });
    if (row.customer_name) rows.push(row);
  }
  return rows;
}

export function downloadUnmatchedReport(run: SyncRun) {
  const csv = toCSV(
    run.unmatched_names.map((n) => ({
      customer_name: n,
      sync_date: new Date(run.run_at).toISOString(),
      file_name: run.file_name,
      user: run.user_email,
    })),
    ["customer_name", "sync_date", "file_name", "user"],
  );
  const stamp = new Date(run.run_at).toISOString().replace(/[:.]/g, "-");
  downloadFile(`unmatched-${stamp}.csv`, csv);
}

export function downloadSyncSummary(run: SyncRun) {
  const csv = toCSV(
    [
      {
        sync_date: new Date(run.run_at).toISOString(),
        user: run.user_email,
        file_name: run.file_name,
        source: run.source,
        total_processed: run.total_count,
        updated: run.updated_count,
        new: run.new_count,
        unmatched: run.unmatched_count,
      },
    ],
    [
      "sync_date",
      "user",
      "file_name",
      "source",
      "total_processed",
      "updated",
      "new",
      "unmatched",
    ],
  );
  const stamp = new Date(run.run_at).toISOString().replace(/[:.]/g, "-");
  downloadFile(`sync-summary-${stamp}.csv`, csv);
}

export function AdoptionSyncCard() {
  const upload = useServerFn(uploadAdoptionRecords);
  const sync = useServerFn(syncAdoptionData);
  const getLast = useServerFn(getLastSyncRun);
  const { refetch, mode } = useCustomers();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "upload" | "sync">("idle");
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);
  const [pendingFile, setPendingFile] = useState<string>("");
  const [showUnmatched, setShowUnmatched] = useState(false);

  const loadLast = useCallback(async () => {
    try {
      const { run } = await getLast();
      setLastRun(run as SyncRun | null);
    } catch { /* ignore */ }
  }, [getLast]);

  useEffect(() => { void loadLast(); }, [loadLast]);

  const onUpload = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload");
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        toast.error("No rows parsed. Check the CSV header row.");
        return;
      }
      const res = await upload({ data: { rows, source: "manual_upload" } });
      setPendingFile(file.name);
      toast.success(`Staged ${res.staged} adoption rows from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy("idle");
    }
  };

  const onSync = async () => {
    if (!confirm("Sync adoption data into customers? Expansion fields (pitch, confidence, upsell, status, notes) will NOT be touched.")) return;
    setBusy("sync");
    try {
      const { run } = await sync({ data: { source: "manual_upload", file_name: pendingFile } });
      setLastRun(run as SyncRun);
      toast.success(`Sync complete · ${run.updated_count} updated · ${run.new_count} new · ${run.unmatched_count} unmatched`);
      if (mode === "cloud") await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy("idle");
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <SectionHeader
          title="Adoption Sync"
          sub="Revised Adoption Score sheet is the source of truth for adoption fields. Expansion intelligence stays owned by this app."
        />
        <Link
          to="/sync-history"
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border text-[11px] font-medium hover:bg-surface-raised"
        >
          <History className="w-3.5 h-3.5" /> Sync History
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-md bg-surface-raised border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Owned by Adoption source</div>
          <div className="text-[11px] text-foreground/80 leading-relaxed">
            Adoption % · No. Modules · Current Systems · Adoption POC · Sales POC · Customer Age · Cluster · State
          </div>
        </div>
        <div className="p-3 rounded-md bg-surface-raised border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Owned by Expansion OS</div>
          <div className="text-[11px] text-foreground/80 leading-relaxed">
            Final Pitch · Confidence · Upsell Value · Status · Notes · Expansion Type · Expansion Motion · Site Survey · Owner
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={onUpload}
          disabled={busy !== "idle"}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-surface-raised disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" /> {busy === "upload" ? "Uploading…" : "Upload Adoption CSV"}
        </button>
        {pendingFile && (
          <span className="text-[11px] text-muted-foreground">Staged: <code>{pendingFile}</code></span>
        )}
        <button
          onClick={onSync}
          disabled={busy !== "idle"}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCcw className="w-3.5 h-3.5" /> {busy === "sync" ? "Syncing…" : "Sync Adoption Data"}
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      </div>

      <div className="text-[10px] text-muted-foreground mb-3">
        CSV headers: <code>Customer Name, Adoption %, No Modules, Current Systems, Adoption POC, Sales POC, Customer Age, Cluster, State</code>. Multiple systems separated by <code>;</code> or <code>|</code>. Matched by Customer Name.
      </div>

      {lastRun ? (
        <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-primary text-[12px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Last sync — {new Date(lastRun.run_at).toLocaleString()}
              {lastRun.user_email && <span className="text-muted-foreground font-normal"> · by {lastRun.user_email}</span>}
              {lastRun.file_name && <span className="text-muted-foreground font-normal"> · <code>{lastRun.file_name}</code></span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => downloadSyncSummary(lastRun)}
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border text-[11px] hover:bg-surface-raised"
              >
                <Download className="w-3 h-3" /> Summary
              </button>
              <button
                onClick={() => downloadUnmatchedReport(lastRun)}
                disabled={lastRun.unmatched_count === 0}
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border text-[11px] hover:bg-surface-raised disabled:opacity-40"
              >
                <Download className="w-3 h-3" /> Unmatched
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <Stat label="Total Processed" value={lastRun.total_count} tone="neutral" />
            <Stat label="Updated" value={lastRun.updated_count} tone="ok" />
            <Stat label="New" value={lastRun.new_count} tone="ok" />
            <Stat label="Unmatched" value={lastRun.unmatched_count} tone={lastRun.unmatched_count ? "warn" : "neutral"} />
          </div>
          {lastRun.unmatched_count > 0 && (
            <button
              onClick={() => setShowUnmatched((v) => !v)}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              {showUnmatched ? "Hide" : "Show"} unmatched customer names
            </button>
          )}
          {showUnmatched && (
            <ul className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-surface p-2 text-[11px] font-mono">
              {lastRun.unmatched_names.map((n) => (
                <li key={n} className="py-0.5">{n}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">No sync has been run yet.</div>
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "neutral" }) {
  const cls =
    tone === "ok" ? "text-emerald-500" :
    tone === "warn" ? "text-amber-500" :
    "text-foreground";
  return (
    <div className="p-2 rounded bg-surface border border-border">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-[16px] font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
