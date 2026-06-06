import { useEffect, useState } from "react";
import { X, Edit3, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useCustomers } from "@/store/customers";
import { TierBadge, StatusBadge, TypeBadge, MotionBadge, ExpansionPath } from "@/components/ui/atoms";
import {
  allSystems, expansionTypes, expansionMotions, statuses,
  type ExpansionType, type ExpansionMotion, type OpportunityStatus, type ICPTier,
} from "@/data/sample";

const COLLAPSE_KEY = "metalcloud_c360_collapsed_v1";

export function CustomerDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { customers, update } = useCustomers();
  const c = customers.find((x) => x.id === id);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      if (raw) setCollapsed(new Set(JSON.parse(raw)));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed])); } catch {}
  }, [collapsed]);
  const toggle = (k: string) =>
    setCollapsed((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!id) return null;
  if (!c) return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
    </div>
  );

  const missingSystems = allSystems.filter((s) => !c.currentSystems.includes(s));
  const upd = (patch: Partial<typeof c>) => update(c.id, patch);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-background border-l border-border h-full overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold shrink-0">
              {c.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <EditableHeading value={c.name} onChange={(v) => upd({ name: v })} />
                <TierBadge tier={c.icpTier} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Tier {c.icpTier} · {c.units} Units · {c.turnover > 0 ? `₹${c.turnover} Cr` : "Turnover —"}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-surface-raised">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Customer Profile */}
          <Section id="profile" title="Customer Profile" collapsed={collapsed} toggle={toggle}>
            <Grid>
              <EditRow k="Cluster" v={c.cluster} onChange={(v) => upd({ cluster: v })} />
              <EditRow k="State" v={c.state} onChange={(v) => upd({ state: v })} />
              <NumberRow k="Turnover (Cr)" v={c.turnover} onChange={(v) => upd({ turnover: v })} placeholder="—" />
              <SelectRow k="ICP Tier" v={c.icpTier} options={["A", "B", "C"] as ICPTier[]}
                onChange={(v) => upd({ icpTier: v as ICPTier })} />
              <EditRow k="Casting Type" v={c.castingType} onChange={(v) => upd({ castingType: v })} multiline />
              <NumberRow k="Customer Age (days)" v={c.customerAge} onChange={(v) => upd({ customerAge: v })} />
              <EditRow k="Adoption POC" v={c.adoptionPoc} onChange={(v) => upd({ adoptionPoc: v })} />
              <EditRow k="Sales POC" v={c.salesPoc} onChange={(v) => upd({ salesPoc: v })} />
            </Grid>
            {c.unitDetails !== undefined && (
              <div className="mt-3 p-3 rounded-lg bg-surface-raised border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Connected Foundries / Units ({c.units})
                </div>
                <textarea
                  value={c.unitDetails}
                  onChange={(e) => upd({ unitDetails: e.target.value })}
                  placeholder="List units, plants, foundries…"
                  className="w-full bg-transparent text-[12px] leading-relaxed focus:outline-none resize-none min-h-[40px]"
                />
              </div>
            )}
          </Section>

          {/* Adoption Intelligence */}
          <Section id="adoption" title="Adoption Intelligence" collapsed={collapsed} toggle={toggle}>
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground uppercase tracking-wider">Adoption</span>
                <span className="font-mono font-semibold">{c.adoption}%</span>
              </div>
              <input type="range" min={0} max={100} value={c.adoption}
                onChange={(e) => upd({ adoption: Number(e.target.value) })}
                className="w-full accent-primary" />
              <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden mt-1">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${c.adoption}%` }} />
              </div>
            </div>
            <Grid>
              <NumberRow k="No. Modules" v={c.noModules} onChange={(v) => upd({ noModules: v })} />
              <NumberRow k="User Lite" v={c.userLite} onChange={(v) => upd({ userLite: v })} />
              <NumberRow k="User Pro" v={c.userPro} onChange={(v) => upd({ userPro: v })} />
              <NumberRow k="Units" v={c.units} onChange={(v) => upd({ units: v })} />
            </Grid>
          </Section>

          {/* Product Footprint */}
          <Section id="footprint" title="Product Footprint" collapsed={collapsed} toggle={toggle}>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Current Systems</div>
                <div className="flex flex-wrap gap-1">
                  {c.currentSystems.map((s) => (
                    <button key={s}
                      onClick={() => upd({ currentSystems: c.currentSystems.filter((x) => x !== s) })}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-mono hover:bg-success/25">
                      <Check className="w-2.5 h-2.5" /> {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Available — click to add</div>
                <div className="flex flex-wrap gap-1">
                  {missingSystems.map((s) => (
                    <button key={s}
                      onClick={() => upd({ currentSystems: [...c.currentSystems, s] })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-mono hover:bg-warning/20">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-raised border border-border col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Hardware Installed</div>
                <input
                  value={c.hardwareInstalled.join(", ")}
                  onChange={(e) => upd({ hardwareInstalled: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="comma-separated"
                  className="w-full bg-transparent text-[12px] focus:outline-none"
                />
              </div>
            </div>
          </Section>

          {/* Expansion Intelligence */}
          <Section id="expansion" title="Expansion Intelligence" collapsed={collapsed} toggle={toggle}>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-primary">Final Pitch</div>
                <Edit3 className="w-3 h-3 text-primary/60" />
              </div>
              <input
                value={c.nextBestPitch}
                onChange={(e) => upd({ nextBestPitch: e.target.value })}
                placeholder="Define the final pitch…"
                className="w-full bg-transparent font-display text-base font-semibold focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Suggested Opportunities</div>
              {c.suggestedOpportunities.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No further modules in the journey.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {c.suggestedOpportunities.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold">{i + 1}</div>
                      <div className="font-mono text-[12px] font-medium">{s}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Expansion Path</div>
              <ExpansionPath path={c.expansionPath} />
            </div>
            <Grid>
              <SelectRow k="Expansion Type" v={c.expansionType} options={expansionTypes}
                onChange={(v) => upd({ expansionType: v as ExpansionType })}
                render={(v) => <TypeBadge type={v as ExpansionType} />} />
              <SelectRow k="Expansion Motion" v={c.expansionMotion} options={expansionMotions}
                onChange={(v) => upd({ expansionMotion: v as ExpansionMotion })}
                render={(v) => <MotionBadge motion={v as ExpansionMotion} />} />
              <ToggleRow k="Site Visit Required" v={c.siteSurveyRequired} onChange={(v) => upd({ siteSurveyRequired: v })} accent="warning" />
              <ToggleRow k="Multi-Unit Opportunity" v={c.multiUnitOpportunity} onChange={(v) => upd({ multiUnitOpportunity: v })} accent="info" />
            </Grid>
          </Section>

          {/* Opportunity / Commercial */}
          <Section id="opportunity" title="Opportunity Status" collapsed={collapsed} toggle={toggle}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Upsell Value (₹ L)</div>
                <input type="number" value={c.upsellValue}
                  onChange={(e) => upd({ upsellValue: Number(e.target.value) })}
                  className="w-full bg-transparent font-display text-xl font-semibold focus:outline-none" />
              </div>
              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Confidence %</div>
                <input type="number" min={0} max={100} value={c.confidence}
                  onChange={(e) => upd({ confidence: Number(e.target.value) })}
                  className="w-full bg-transparent font-display text-xl font-semibold text-success focus:outline-none" />
              </div>
            </div>
            <Grid>
              <SelectRow k="Status" v={c.status} options={statuses}
                onChange={(v) => upd({ status: v as OpportunityStatus })}
                render={(v) => <StatusBadge status={v as OpportunityStatus} />} />
              <EditRow k="Owner" v={c.owner} onChange={(v) => upd({ owner: v })} />
              <EditRow k="Next Step" v={c.nextStep} onChange={(v) => upd({ nextStep: v })} />
            </Grid>
          </Section>

          {/* Notes */}
          <Section id="notes" title="Notes" collapsed={collapsed} toggle={toggle}>
            <textarea
              value={c.notes}
              onChange={(e) => upd({ notes: e.target.value })}
              placeholder="Add notes about this customer…"
              className="w-full h-32 p-3 rounded-lg bg-surface-raised border border-border text-[13px] resize-y focus:outline-none focus:border-border-strong"
            />
          </Section>
        </div>
      </aside>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function Section({
  id, title, children, collapsed, toggle,
}: { id: string; title: string; children: React.ReactNode; collapsed: Set<string>; toggle: (id: string) => void }) {
  const isCollapsed = collapsed.has(id);
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-surface-raised/40 rounded-t-lg"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{title}</h3>
      </button>
      {!isCollapsed && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">{children}</div>;
}

function EditRow({ k, v, onChange, multiline }: { k: string; v: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-border/40">
      <span className="text-[11px] text-muted-foreground pt-1 shrink-0">{k}</span>
      {multiline ? (
        <textarea value={v} onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-[12px] font-medium bg-transparent text-right focus:outline-none focus:bg-surface-raised rounded px-1 min-h-[24px] resize-none" />
      ) : (
        <input value={v} onChange={(e) => onChange(e.target.value)} placeholder="—"
          className="flex-1 text-[12px] font-medium bg-transparent text-right focus:outline-none focus:bg-surface-raised rounded px-1" />
      )}
    </div>
  );
}

function NumberRow({ k, v, onChange, placeholder }: { k: string; v: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
      <span className="text-[11px] text-muted-foreground">{k}</span>
      <input type="number" value={v || ""} onChange={(e) => onChange(Number(e.target.value) || 0)} placeholder={placeholder || "0"}
        className="w-28 text-[12px] font-medium font-mono bg-transparent text-right focus:outline-none focus:bg-surface-raised rounded px-1" />
    </div>
  );
}

function SelectRow<T extends string>({
  k, v, options, onChange, render,
}: { k: string; v: T; options: readonly T[]; onChange: (v: T) => void; render?: (v: T) => React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
      <span className="text-[11px] text-muted-foreground">{k}</span>
      <div className="relative">
        {render ? render(v) : <span className="text-[12px] font-medium">{v}</span>}
        <select value={v} onChange={(e) => onChange(e.target.value as T)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full">
          {options.map((o) => <option key={o} value={o} className="bg-popover">{o}</option>)}
        </select>
      </div>
    </div>
  );
}

function ToggleRow({ k, v, onChange, accent }: { k: string; v: boolean; onChange: (v: boolean) => void; accent?: "warning" | "info" }) {
  const color = v ? (accent === "warning" ? "bg-warning/15 text-warning" : accent === "info" ? "bg-info/15 text-info" : "bg-primary/15 text-primary") : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
      <span className="text-[11px] text-muted-foreground">{k}</span>
      <button onClick={() => onChange(!v)} className={`text-[11px] px-2 py-0.5 rounded font-medium ${color}`}>
        {v ? "Yes" : "No"}
      </button>
    </div>
  );
}

function EditableHeading({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-display text-lg font-semibold bg-transparent focus:outline-none focus:bg-surface-raised rounded px-1 -mx-1 min-w-0 flex-1"
    />
  );
}
