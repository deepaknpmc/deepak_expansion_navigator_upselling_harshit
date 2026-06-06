import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { useAuth } from "@/hooks/use-auth";
import { Card, SectionHeader } from "@/components/ui/atoms";
import { AdoptionSyncCard } from "@/components/settings/AdoptionSyncCard";
import { Database, FileSpreadsheet, Sparkles, RotateCcw, Download, Upload, Cloud, CloudOff, LogOut, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — MetalCloud" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { reset, customers, exportData, importData, mode, migrateToCloud, refetch } = useCustomers();
  const { user, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ before: number; after: number; imported: number } | null>(null);

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `metalcloud-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLastExport(new Date().toLocaleString());
    toast.success(`Exported ${customers.length} customers`);
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("This will replace ALL current data with the backup contents. Continue?")) return;
    try {
      const text = await file.text();
      const result = importData(text);
      if (result.ok) toast.success(`Restored ${result.count} customers`);
      else toast.error(result.error || "Import failed");
    } catch {
      toast.error("Could not read file");
    }
  };

  const handleMigrate = async () => {
    if (!confirm(`Migrate ${customers.length} customers to Lovable Cloud? Existing cloud rows with matching IDs will be replaced.`)) return;
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await migrateToCloud();
      if (res.ok) {
        setMigrationResult({ before: res.before, after: res.after, imported: res.imported });
        toast.success(`Migrated ${res.imported} customers (cloud: ${res.before} → ${res.after})`);
      } else {
        toast.error(res.error || "Migration failed");
      }
    } finally {
      setMigrating(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="font-display text-2xl font-semibold tracking-tight mb-6">Settings</h1>

        <div className="space-y-4">
          {/* Cloud status */}
          <Card className="p-5">
            <SectionHeader title="Cloud Status" sub="Where this workspace currently reads and writes data" />
            <div className="flex items-center justify-between p-3 rounded-md bg-surface-raised border border-border">
              <div className="flex items-center gap-2.5">
                {mode === "cloud" ? <Cloud className="w-4 h-4 text-primary" /> : <CloudOff className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <div className="text-[13px] font-medium">{mode === "cloud" ? "Lovable Cloud (primary)" : "Browser storage (legacy)"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {mode === "cloud"
                      ? "All edits sync to the shared cloud workspace."
                      : "Edits are saved to this browser only. Migrate to share with your team."}
                  </div>
                </div>
              </div>
              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{user.email}</span>
                  <button
                    onClick={() => signOut()}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] hover:bg-surface transition-colors"
                  >
                    <LogOut className="w-3 h-3" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Migrate to Cloud */}
          {mode === "legacy" && (
            <Card className="p-5">
              <SectionHeader title="Migrate to Cloud" sub="Push all current customer records, opportunities and edits to the shared cloud database." />
              <div className="text-[12px] text-muted-foreground mb-3">
                Ready to migrate: <strong className="text-foreground">{customers.length}</strong> customers
              </div>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Cloud className="w-3.5 h-3.5" />
                {migrating ? "Migrating…" : "Migrate to Cloud"}
              </button>
              {migrationResult && (
                <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/20 text-[12px]">
                  <div className="flex items-center gap-1.5 text-primary font-medium mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Migration complete
                  </div>
                  <div className="text-muted-foreground">
                    Cloud row count: <strong className="text-foreground">{migrationResult.before}</strong> → <strong className="text-foreground">{migrationResult.after}</strong> · Imported: <strong className="text-foreground">{migrationResult.imported}</strong>
                  </div>
                </div>
              )}
            </Card>
          )}

          {mode === "cloud" && (
            <Card className="p-5">
              <SectionHeader title="Re-migrate / Sync" sub="Push a new dataset to cloud (replaces matching IDs). Local edits already sync automatically." />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-surface-raised disabled:opacity-50"
                >
                  <Cloud className="w-3.5 h-3.5" /> {migrating ? "Syncing…" : "Re-push current set"}
                </button>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-surface-raised"
                >
                  Reload from cloud
                </button>
              </div>
              {migrationResult && (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Last sync — cloud: {migrationResult.before} → {migrationResult.after} · pushed: {migrationResult.imported}
                </div>
              )}
            </Card>
          )}

          {/* Adoption Sync — cloud only (requires auth) */}
          {mode === "cloud" && <AdoptionSyncCard />}

          {/* Backup & Restore (always available) */}
          <Card className="p-5">
            <SectionHeader title="Backup & Restore" sub="Download a full snapshot or restore from a previous backup file. Available in any mode." />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" /> Export All Data
              </button>
              <button
                onClick={handleImportClick}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-surface-raised transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Import Backup
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
              {lastExport && (
                <span className="text-[11px] text-muted-foreground ml-1">Last export: {lastExport}</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-3">
              Backups include all customer records, opportunity status, confidence, upsell values, notes and inline edits. Importing replaces the current workspace ({mode === "cloud" ? "and re-pushes to cloud" : "browser-only"}).
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Data Sources" sub="Connect or import your installed-base data" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: FileSpreadsheet, name: "Excel / CSV", desc: "Bulk upload customers", status: "Available" },
                { icon: Database, name: "Database", desc: "Direct integration", status: "Coming soon" },
                { icon: Sparkles, name: "Google Sheets", desc: "Two-way sync", status: "Coming soon" },
              ].map((s) => (
                <div key={s.name} className="p-3 rounded-lg border border-border bg-surface-raised">
                  <s.icon className="w-5 h-5 text-primary mb-2" />
                  <div className="text-[13px] font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                  <div className="text-[10px] mt-2 inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.status}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Workspace" sub={`${customers.length} customers · ${mode === "cloud" ? "Lovable Cloud" : "browser storage"}`} />
            {mode === "legacy" ? (
              <button
                onClick={() => { if (confirm("Reset all browser data to sample? This cannot be undone.")) reset(); }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12px] font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to sample data
              </button>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                Reset disabled in Cloud mode — data lives in the shared workspace. Use row-level deletes from the matrix or your admin tools.
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
