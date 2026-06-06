import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Download, Trash2, X, ArrowUpDown, ChevronDown,
  MoreHorizontal, Copy, StickyNote, Bookmark, Eye, Check, CloudCheck,
  PanelLeftClose,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useCustomers } from "@/store/customers";
import { TierBadge, StatusBadge, TypeBadge, MotionBadge } from "@/components/ui/atoms";
import { CustomerDrawer } from "@/components/customer/CustomerDrawer";
import {
  expansionTypes, expansionMotions, statuses, allStates, allClusters, allOwners,
  type Customer, type OpportunityStatus, type ExpansionType,
} from "@/data/sample";

export const Route = createFileRoute("/matrix")({
  head: () => ({
    meta: [
      { title: "Upselling Matrix — MetalCloud" },
      { name: "description", content: "Intelligent view of expansion opportunities across customers." },
    ],
  }),
  component: MatrixPage,
});

type SortKey = keyof Customer | null;

interface ColumnDef {
  key: string;
  label: string;
  group: "Customer" | "Footprint" | "Intelligence" | "Commercial" | "Execution";
  // frozen columns are pinned to the left and cannot be hidden
  frozen?: boolean;
  defaultHidden?: boolean;
  sortKey?: keyof Customer;
  width?: number; // px, used for sticky offset computation
}

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Customer", group: "Customer", frozen: true, sortKey: "name", width: 220 },
  { key: "cluster", label: "Cluster", group: "Customer", frozen: true, sortKey: "cluster", width: 130 },
  { key: "state", label: "State", group: "Customer", frozen: true, sortKey: "state", width: 130 },
  { key: "icpTier", label: "ICP", group: "Customer" },
  { key: "units", label: "Units", group: "Customer", sortKey: "units" },
  { key: "turnover", label: "Turnover", group: "Customer", sortKey: "turnover" },
  { key: "castingType", label: "Casting", group: "Customer" },
  { key: "customerAge", label: "Customer Age", group: "Customer", defaultHidden: true, sortKey: "customerAge" },
  { key: "adoption", label: "Adoption", group: "Footprint", sortKey: "adoption" },
  { key: "currentSystems", label: "Current Systems", group: "Footprint" },
  { key: "userLite", label: "Lite/Pro", group: "Footprint" },
  { key: "hardware", label: "HW", group: "Footprint", defaultHidden: true },
  { key: "suggestedOpportunities", label: "Suggested Opps", group: "Intelligence" },
  { key: "nextBestPitch", label: "Final Pitch", group: "Intelligence" },
  { key: "expansionType", label: "Type", group: "Intelligence" },
  { key: "expansionMotion", label: "Motion", group: "Intelligence" },
  { key: "siteSurveyRequired", label: "Site", group: "Intelligence" },
  { key: "multiUnitOpportunity", label: "Multi-U", group: "Intelligence", defaultHidden: true },
  { key: "upsellValue", label: "Value", group: "Commercial", sortKey: "upsellValue" },
  { key: "confidence", label: "Confidence", group: "Commercial", sortKey: "confidence" },
  { key: "owner", label: "Owner", group: "Execution" },
  { key: "salesPoc", label: "Sales POC", group: "Execution", defaultHidden: true },
  { key: "status", label: "Status", group: "Execution" },
  { key: "nextStep", label: "Next Step", group: "Execution" },
];

interface SavedView {
  id: string;
  name: string;
  builtin?: boolean;
  filters: Partial<{
    query: string;
    tier: string;
    state: string;
    cluster: string;
    owner: string;
    type: string;
    motion: string;
    status: string;
    minAdoption: number;
    siteOnly: boolean;
    excludeClosed: boolean;
  }>;
}

const BUILTIN_VIEWS: SavedView[] = [
  { id: "all", name: "All Customers", builtin: true, filters: {} },
  { id: "strategic", name: "Strategic Accounts", builtin: true, filters: { tier: "A" } },
  { id: "growth", name: "Growth Accounts", builtin: true, filters: { minAdoption: 50 } },
  { id: "site", name: "Site Visit Candidates", builtin: true, filters: { siteOnly: true } },
  { id: "pipeline", name: "Pipeline Accounts", builtin: true, filters: { excludeClosed: true } },
];

const VIEWS_KEY = "metalcloud_views_v1";
const COLS_KEY = "metalcloud_columns_v1";
const ACTIVE_VIEW_KEY = "metalcloud_active_view_v1";

const truncate = (s: string, n: number) => (s && s.length > n ? s.slice(0, n).trimEnd() + "…" : s || "");

function MatrixPage() {
  const { customers, update, add, remove, duplicate, appendNote, savedAt } = useCustomers();

  // ── Persisted user preferences ─────────────────────────────────────────────
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>("all");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    () => new Set(COLUMNS.filter((c) => c.defaultHidden).map((c) => c.key))
  );
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);
  const viewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEWS_KEY);
      if (v) setSavedViews(JSON.parse(v));
      const c = localStorage.getItem(COLS_KEY);
      if (c) setHiddenCols(new Set(JSON.parse(c)));
      const a = localStorage.getItem(ACTIVE_VIEW_KEY);
      if (a) setActiveViewId(a);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(VIEWS_KEY, JSON.stringify(savedViews)); } catch {} }, [savedViews]);
  useEffect(() => { try { localStorage.setItem(COLS_KEY, JSON.stringify([...hiddenCols])); } catch {} }, [hiddenCols]);
  useEffect(() => { try { localStorage.setItem(ACTIVE_VIEW_KEY, activeViewId); } catch {} }, [activeViewId]);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsMenuOpen(false);
      if (viewsRef.current && !viewsRef.current.contains(e.target as Node)) setViewsMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ── Filters & sort ─────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("All");
  const [state, setState] = useState("All");
  const [cluster, setCluster] = useState("All");
  const [owner, setOwner] = useState("All");
  const [type, setType] = useState("All");
  const [motion, setMotion] = useState("All");
  const [status, setStatus] = useState("All");
  const [minAdoption, setMinAdoption] = useState(0);
  const [siteOnly, setSiteOnly] = useState(false);
  const [excludeClosed, setExcludeClosed] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const clearAll = () => {
    setQuery(""); setTier("All"); setState("All"); setCluster("All"); setOwner("All");
    setType("All"); setMotion("All"); setStatus("All"); setMinAdoption(0);
    setSiteOnly(false); setExcludeClosed(false);
  };

  const applyView = (v: SavedView) => {
    clearAll();
    const f = v.filters;
    if (f.query) setQuery(f.query);
    if (f.tier) setTier(f.tier);
    if (f.state) setState(f.state);
    if (f.cluster) setCluster(f.cluster);
    if (f.owner) setOwner(f.owner);
    if (f.type) setType(f.type);
    if (f.motion) setMotion(f.motion);
    if (f.status) setStatus(f.status);
    if (f.minAdoption) setMinAdoption(f.minAdoption);
    if (f.siteOnly) setSiteOnly(true);
    if (f.excludeClosed) setExcludeClosed(true);
    setActiveViewId(v.id);
    setViewsMenuOpen(false);
  };

  const saveCurrentView = () => {
    const name = prompt("Name this view");
    if (!name?.trim()) return;
    const v: SavedView = {
      id: `view_${Date.now()}`,
      name: name.trim(),
      filters: {
        query: query || undefined,
        tier: tier !== "All" ? tier : undefined,
        state: state !== "All" ? state : undefined,
        cluster: cluster !== "All" ? cluster : undefined,
        owner: owner !== "All" ? owner : undefined,
        type: type !== "All" ? type : undefined,
        motion: motion !== "All" ? motion : undefined,
        status: status !== "All" ? status : undefined,
        minAdoption: minAdoption || undefined,
        siteOnly: siteOnly || undefined,
        excludeClosed: excludeClosed || undefined,
      },
    };
    setSavedViews((prev) => [...prev, v]);
    setActiveViewId(v.id);
  };

  const allViews = useMemo(() => [...BUILTIN_VIEWS, ...savedViews], [savedViews]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = customers.filter((c) => {
      if (q) {
        const hay = [
          c.name, c.cluster, c.state, c.icpTier, c.castingType,
          c.nextBestPitch, c.owner, c.salesPoc, c.adoptionPoc, c.nextStep, c.notes,
          ...(c.currentSystems || []), ...(c.suggestedOpportunities || []),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tier !== "All" && c.icpTier !== tier) return false;
      if (state !== "All" && c.state !== state) return false;
      if (cluster !== "All" && c.cluster !== cluster) return false;
      if (owner !== "All" && c.salesPoc !== owner && c.owner !== owner) return false;
      if (type !== "All" && c.expansionType !== type) return false;
      if (motion !== "All" && c.expansionMotion !== motion) return false;
      if (status !== "All" && c.status !== status) return false;
      if (minAdoption > 0 && c.adoption < minAdoption) return false;
      if (siteOnly && !c.siteSurveyRequired) return false;
      if (excludeClosed && (c.status === "Won" || c.status === "Lost")) return false;
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey] as any;
        const bv = b[sortKey] as any;
        if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return list;
  }, [customers, query, tier, state, cluster, owner, type, motion, status, minAdoption, siteOnly, excludeClosed, sortKey, sortDir]);

  const toggleSort = (k: keyof Customer) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const toggleSel = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = () => {
    const cols: (keyof Customer)[] = ["name", "cluster", "state", "icpTier", "turnover", "units", "adoption", "nextBestPitch", "expansionType", "expansionMotion", "upsellValue", "confidence", "owner", "status", "nextStep"];
    const csv = [cols.join(",")].concat(
      filtered.map((c) => cols.map((k) => JSON.stringify(c[k] ?? "")).join(","))
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "upselling-matrix.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const bulkDelete = () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} row(s)? This cannot be undone.`)) return;
    selected.forEach((id) => remove(id));
    setSelected(new Set());
  };

  // ── Visible columns + sticky offsets ───────────────────────────────────────
  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => c.frozen || !hiddenCols.has(c.key)),
    [hiddenCols]
  );

  // Build sticky-left offsets for the frozen + checkbox columns
  const CHECK_W = 36;
  const ACTION_W = 36;
  const stickyOffsets = useMemo(() => {
    const offs: Record<string, number> = {};
    let acc = CHECK_W + ACTION_W;
    for (const c of visibleColumns) {
      if (!c.frozen) break;
      offs[c.key] = acc;
      acc += c.width || 130;
    }
    return offs;
  }, [visibleColumns]);

  const totalActiveFilters = [
    tier !== "All", state !== "All", cluster !== "All", owner !== "All",
    type !== "All", motion !== "All", status !== "All",
    minAdoption > 0, siteOnly, excludeClosed, !!query,
  ].filter(Boolean).length;

  const activeView = allViews.find((v) => v.id === activeViewId);

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* View switcher */}
              <div ref={viewsRef} className="relative">
                <button
                  onClick={() => setViewsMenuOpen((o) => !o)}
                  className="h-9 px-3 rounded-md bg-surface border border-border hover:bg-surface-raised inline-flex items-center gap-2 text-[13px] font-medium"
                >
                  <Bookmark className="w-3.5 h-3.5 text-primary" />
                  {activeView?.name ?? "All Customers"}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {viewsMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-border bg-popover shadow-xl z-30 py-1">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Built-in</div>
                    {BUILTIN_VIEWS.map((v) => (
                      <ViewItem key={v.id} v={v} active={activeViewId === v.id} onPick={() => applyView(v)} />
                    ))}
                    {savedViews.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mt-1 border-t border-border">My Views</div>
                        {savedViews.map((v) => (
                          <ViewItem
                            key={v.id} v={v} active={activeViewId === v.id}
                            onPick={() => applyView(v)}
                            onDelete={() => {
                              setSavedViews((prev) => prev.filter((x) => x.id !== v.id));
                              if (activeViewId === v.id) setActiveViewId("all");
                            }}
                          />
                        ))}
                      </>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <button onClick={saveCurrentView} className="w-full text-left px-3 py-2 text-[12px] hover:bg-surface-raised inline-flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> Save current as view…
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="font-display text-lg font-semibold tracking-tight">Upselling Matrix</h1>
                <p className="text-[11px] text-muted-foreground">
                  {filtered.length} of {customers.length} customers
                  {totalActiveFilters > 0 && <> · {totalActiveFilters} filter{totalActiveFilters > 1 ? "s" : ""} active</>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SavedIndicator savedAt={savedAt} />
              {/* Column visibility */}
              <div ref={colsRef} className="relative">
                <button
                  onClick={() => setColsMenuOpen((o) => !o)}
                  className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] font-medium hover:bg-surface-raised inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Columns
                </button>
                {colsMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 max-h-96 overflow-auto rounded-lg border border-border bg-popover shadow-xl z-30 py-1">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Show / hide columns</div>
                    {COLUMNS.map((c) => {
                      const checked = c.frozen || !hiddenCols.has(c.key);
                      return (
                        <button
                          key={c.key}
                          onClick={() => {
                            if (c.frozen) return;
                            setHiddenCols((prev) => {
                              const n = new Set(prev);
                              n.has(c.key) ? n.delete(c.key) : n.add(c.key);
                              return n;
                            });
                          }}
                          disabled={c.frozen}
                          className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-raised inline-flex items-center gap-2 disabled:opacity-60"
                        >
                          <span className={`w-3.5 h-3.5 rounded border ${checked ? "bg-primary border-primary" : "border-border"} inline-flex items-center justify-center`}>
                            {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </span>
                          <span className="flex-1">{c.label}</span>
                          {c.frozen && <PanelLeftClose className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={exportCsv} className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] font-medium hover:bg-surface-raised inline-flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={() => { const c = add(); setOpenId(c.id); }} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5 glow-primary">
                <Plus className="w-3.5 h-3.5" /> Add Customer
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, cluster, casting, systems, notes…"
                className="w-full h-8 pl-9 pr-3 rounded-md bg-surface border border-border text-[12px] focus:outline-none focus:border-border-strong"
              />
            </div>
            <Pill label="Tier" value={tier} options={["All", "A", "B", "C"]} onChange={setTier} />
            <Pill label="Cluster" value={cluster} options={["All", ...allClusters]} onChange={setCluster} />
            <Pill label="State" value={state} options={["All", ...allStates]} onChange={setState} />
            <Pill label="Owner" value={owner} options={["All", ...allOwners]} onChange={setOwner} />
            <Pill label="Type" value={type} options={["All", ...expansionTypes]} onChange={setType} />
            <Pill label="Motion" value={motion} options={["All", ...expansionMotions]} onChange={setMotion} />
            <Pill label="Status" value={status} options={["All", ...statuses]} onChange={setStatus} />
            <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-surface border border-border text-[11px]">
              <span className="text-muted-foreground">Adoption ≥</span>
              <input type="number" min={0} max={100} value={minAdoption}
                onChange={(e) => setMinAdoption(Number(e.target.value) || 0)}
                className="w-10 bg-transparent font-medium focus:outline-none" />
              <span className="text-muted-foreground">%</span>
            </label>
            <button onClick={() => setSiteOnly((v) => !v)}
              className={`h-8 px-2.5 rounded-md border text-[11px] ${siteOnly ? "bg-warning/15 text-warning border-warning/40" : "bg-surface border-border text-muted-foreground"}`}>
              Site Survey
            </button>
            <button onClick={() => setExcludeClosed((v) => !v)}
              className={`h-8 px-2.5 rounded-md border text-[11px] ${excludeClosed ? "bg-primary/15 text-primary border-primary/40" : "bg-surface border-border text-muted-foreground"}`}>
              Hide Won/Lost
            </button>
            {totalActiveFilters > 0 && (
              <button onClick={clearAll} className="h-8 px-2.5 text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
                  <button onClick={bulkDelete} className="h-8 px-2.5 rounded-md text-[11px] text-destructive hover:bg-destructive/10 inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-surface-raised">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <Th className="w-9 sticky left-0 z-30 bg-surface-raised">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())} />
                </Th>
                <Th className="w-9 sticky z-30 bg-surface-raised" style={{ left: CHECK_W }} />
                {visibleColumns.map((c) => {
                  const isSorted = c.sortKey && sortKey === c.sortKey ? sortDir : undefined;
                  const sticky = c.frozen
                    ? { position: "sticky" as const, left: stickyOffsets[c.key], zIndex: 30 }
                    : undefined;
                  return (
                    <Th
                      key={c.key}
                      onClick={c.sortKey ? () => toggleSort(c.sortKey!) : undefined}
                      sort={isSorted}
                      style={sticky}
                      className={c.frozen ? "bg-surface-raised shadow-[1px_0_0_0_hsl(var(--border))]" : ""}
                    >
                      {c.label}
                    </Th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const expanded = expandedRow === c.id;
                return (
                  <tr key={c.id} className="hover:bg-surface-raised/40 group">
                    <Td className="sticky left-0 z-10 bg-background group-hover:bg-surface-raised/40">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} />
                    </Td>
                    <Td className="sticky z-10 bg-background group-hover:bg-surface-raised/40" style={{ left: CHECK_W }}>
                      <RowMenu
                        open={rowMenu === c.id}
                        setOpen={(o) => setRowMenu(o ? c.id : null)}
                        onOpen={() => setOpenId(c.id)}
                        onDuplicate={() => { duplicate(c.id); setRowMenu(null); }}
                        onAddNote={() => {
                          const n = prompt(`Add note for ${c.name}`);
                          if (n) appendNote(c.id, n);
                          setRowMenu(null);
                        }}
                        onCreateOpp={() => {
                          update(c.id, { status: "Identified" });
                          setOpenId(c.id);
                          setRowMenu(null);
                        }}
                        onDelete={() => {
                          if (confirm(`Delete ${c.name}?`)) remove(c.id);
                          setRowMenu(null);
                        }}
                      />
                    </Td>
                    {visibleColumns.map((col) => {
                      const sticky = col.frozen
                        ? { position: "sticky" as const, left: stickyOffsets[col.key], zIndex: 10 }
                        : undefined;
                      const className = col.frozen
                        ? "bg-background group-hover:bg-surface-raised/40 shadow-[1px_0_0_0_hsl(var(--border))]"
                        : "";
                      return (
                        <Td key={col.key} style={sticky} className={className}>
                          {renderCell(col.key, c, {
                            update, setOpenId, expanded,
                            toggleExpand: () => setExpandedRow(expanded ? null : c.id),
                          })}
                        </Td>
                      );
                    })}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="text-center py-16 text-muted-foreground text-sm">
                    No customers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />
    </AppShell>
  );
}

// ── Cell renderer ────────────────────────────────────────────────────────────
function renderCell(
  key: string,
  c: Customer,
  ctx: {
    update: (id: string, p: Partial<Customer>) => void;
    setOpenId: (id: string) => void;
    expanded: boolean;
    toggleExpand: () => void;
  }
) {
  const { update, setOpenId, expanded, toggleExpand } = ctx;
  switch (key) {
    case "name":
      return (
        <button onClick={() => setOpenId(c.id)} className="text-foreground hover:text-primary font-semibold text-left truncate max-w-[200px] block">
          {c.name}
        </button>
      );
    case "cluster":
      return <span className="text-muted-foreground">{c.cluster || "—"}</span>;
    case "state":
      return <span className="font-mono text-muted-foreground">{c.state || "—"}</span>;
    case "icpTier":
      return <TierBadge tier={c.icpTier} />;
    case "units":
      return <span className="font-mono">{c.units}</span>;
    case "turnover": {
      const v = Number(c.turnover);
      if (!v || v <= 0) return <span className="text-muted-foreground/50">—</span>;
      return <span className="font-mono">₹{v} Cr</span>;
    }
    case "castingType": {
      const full = c.castingType || "";
      if (!full) return <span className="text-muted-foreground/50">—</span>;
      const short = truncate(full, 50);
      return (
        <button
          onClick={toggleExpand}
          title={full}
          className={`text-left text-muted-foreground hover:text-foreground ${expanded ? "whitespace-normal max-w-[420px] inline-block" : ""}`}
        >
          {expanded ? full : short}
        </button>
      );
    }
    case "customerAge":
      return <span className="font-mono text-muted-foreground">{c.customerAge}d</span>;
    case "adoption":
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 rounded-full bg-surface-raised overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${c.adoption}%` }} />
          </div>
          <span className="font-mono">{c.adoption}%</span>
        </div>
      );
    case "currentSystems":
      return (
        <div className="flex flex-wrap gap-0.5 max-w-[180px]">
          {c.currentSystems.slice(0, 3).map((s) => (
            <span key={s} className="text-[9px] px-1 py-0.5 rounded bg-surface-raised font-mono">{s}</span>
          ))}
          {c.currentSystems.length > 3 && <span className="text-[9px] text-muted-foreground">+{c.currentSystems.length - 3}</span>}
        </div>
      );
    case "userLite":
      return <span className="font-mono text-[11px]">{c.userLite}/{c.userPro}</span>;
    case "hardware":
      return <span className="text-[10px] text-muted-foreground">{c.hardwareInstalled.length}</span>;
    case "suggestedOpportunities":
      return (
        <div className="flex flex-wrap gap-0.5 max-w-[200px]">
          {c.suggestedOpportunities.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-mono">{s}</span>
          ))}
        </div>
      );
    case "nextBestPitch":
      return (
        <InlineText
          value={c.nextBestPitch}
          onChange={(v) => update(c.id, { nextBestPitch: v })}
          className="font-medium text-foreground"
        />
      );
    case "expansionType":
      return (
        <InlineSelect<ExpansionType>
          value={c.expansionType} options={expansionTypes}
          onChange={(v) => update(c.id, { expansionType: v })}
          render={(v) => <TypeBadge type={v} />}
        />
      );
    case "expansionMotion":
      return (
        <InlineSelect
          value={c.expansionMotion} options={expansionMotions}
          onChange={(v) => update(c.id, { expansionMotion: v as any })}
          render={(v) => <MotionBadge motion={v as any} />}
        />
      );
    case "siteSurveyRequired":
      return (
        <button onClick={() => update(c.id, { siteSurveyRequired: !c.siteSurveyRequired })}
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.siteSurveyRequired ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
          {c.siteSurveyRequired ? "Yes" : "No"}
        </button>
      );
    case "multiUnitOpportunity":
      return (
        <button onClick={() => update(c.id, { multiUnitOpportunity: !c.multiUnitOpportunity })}
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.multiUnitOpportunity ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>
          {c.multiUnitOpportunity ? "Yes" : "No"}
        </button>
      );
    case "upsellValue":
      return <span className="font-mono font-semibold text-foreground">₹{c.upsellValue.toFixed(1)} L</span>;
    case "confidence":
      return (
        <span className={`font-mono font-semibold ${c.confidence >= 65 ? "text-success" : c.confidence >= 40 ? "text-warning" : "text-muted-foreground"}`}>
          {c.confidence}%
        </span>
      );
    case "owner":
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-[9px] font-semibold text-primary-foreground">
            {(c.owner || "?").slice(0, 1)}
          </div>
          <span className="text-[11px]">{c.owner || "—"}</span>
        </div>
      );
    case "salesPoc":
      return <span className="text-[11px] text-muted-foreground">{c.salesPoc || "—"}</span>;
    case "status":
      return (
        <InlineSelect<OpportunityStatus>
          value={c.status} options={statuses}
          onChange={(v) => update(c.id, { status: v })}
          render={(v) => <StatusBadge status={v} />}
        />
      );
    case "nextStep":
      return (
        <InlineText
          value={c.nextStep}
          onChange={(v) => update(c.id, { nextStep: v })}
          className="text-muted-foreground"
        />
      );
    default:
      return null;
  }
}

// ── Small components ─────────────────────────────────────────────────────────
function SavedIndicator({ savedAt }: { savedAt: number | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!savedAt) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [savedAt]);
  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] transition-opacity duration-300 ${visible ? "opacity-100 text-success" : "opacity-50 text-muted-foreground"}`}>
      <CloudCheck className="w-3.5 h-3.5" />
      {visible ? "Saved" : "Auto-save on"}
    </div>
  );
}

function ViewItem({
  v, active, onPick, onDelete,
}: { v: SavedView; active: boolean; onPick: () => void; onDelete?: () => void }) {
  return (
    <div className={`group flex items-center px-2 mx-1 rounded ${active ? "bg-primary/10" : "hover:bg-surface-raised"}`}>
      <button onClick={onPick} className="flex-1 text-left py-1.5 text-[12px]">
        <span className={active ? "text-primary font-medium" : ""}>{v.name}</span>
      </button>
      {onDelete && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function RowMenu({
  open, setOpen, onOpen, onDuplicate, onAddNote, onCreateOpp, onDelete,
}: {
  open: boolean; setOpen: (o: boolean) => void;
  onOpen: () => void; onDuplicate: () => void; onAddNote: () => void;
  onCreateOpp: () => void; onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, setOpen]);
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="p-1 rounded hover:bg-surface-raised text-muted-foreground">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-popover shadow-xl z-40 py-1">
          <MenuItem icon={<Eye className="w-3.5 h-3.5" />} label="Open Customer 360" onClick={onOpen} />
          <MenuItem icon={<Plus className="w-3.5 h-3.5" />} label="Create Opportunity" onClick={onCreateOpp} />
          <MenuItem icon={<StickyNote className="w-3.5 h-3.5" />} label="Add Note" onClick={onAddNote} />
          <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate" onClick={onDuplicate} />
          <div className="my-1 border-t border-border" />
          <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-raised inline-flex items-center gap-2 ${danger ? "text-destructive" : ""}`}>
      {icon} {label}
    </button>
  );
}

function Pill<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-surface border border-border text-[11px] hover:bg-surface-raised cursor-pointer">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer max-w-[120px]">
        {options.map((o) => <option key={o} value={o} className="bg-popover">{o}</option>)}
      </select>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </label>
  );
}

function Th({
  children, onClick, sort, className = "", style,
}: { children?: React.ReactNode; onClick?: () => void; sort?: "asc" | "desc"; className?: string; style?: React.CSSProperties }) {
  return (
    <th
      onClick={onClick}
      style={style}
      className={`border-b border-border px-3 py-2 text-left font-medium whitespace-nowrap ${onClick ? "cursor-pointer hover:text-foreground" : ""} ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && <ArrowUpDown className={`w-3 h-3 ${sort ? "text-primary" : "opacity-30"}`} />}
      </span>
    </th>
  );
}

function Td({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td style={style} className={`border-b border-border/60 px-3 py-2 whitespace-nowrap ${className}`}>{children}</td>;
}

function InlineText({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { setEditing(false); if (v !== value) onChange(v); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(value); setEditing(false); } }}
        className="w-full h-6 px-1.5 rounded bg-input border border-border-strong text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className={`text-left min-w-[80px] max-w-[220px] truncate px-1 -mx-1 rounded hover:bg-surface-raised ${className}`}>
      {value || <span className="text-muted-foreground italic">—</span>}
    </button>
  );
}

function InlineSelect<T extends string>({ value, options, onChange, render }: { value: T; options: readonly T[]; onChange: (v: T) => void; render: (v: T) => React.ReactNode }) {
  return (
    <div className="relative inline-block">
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="absolute inset-0 opacity-0 cursor-pointer w-full">
        {options.map((o) => <option key={o} value={o} className="bg-popover">{o}</option>)}
      </select>
      {render(value)}
    </div>
  );
}
