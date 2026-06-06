import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sampleCustomers, normalizeCustomer, type Customer, type OpportunityStatus } from "@/data/sample";
import { useAuth } from "@/hooks/use-auth";
import { listCustomers, upsertCustomer, deleteCustomer } from "@/lib/customers.functions";
import { migrateBackup } from "@/lib/migrate.functions";

const STORAGE_KEY = "metalcloud_customers_v2";

type Mode = "legacy" | "cloud";

interface Ctx {
  customers: Customer[];
  update: (id: string, patch: Partial<Customer>) => void;
  add: (c?: Partial<Customer>) => Customer;
  duplicate: (id: string) => Customer | null;
  remove: (id: string) => void;
  setStatus: (id: string, status: OpportunityStatus) => void;
  appendNote: (id: string, note: string) => void;
  reset: () => void;
  savedAt: number | null;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; count?: number; error?: string };
  mode: Mode;
  loading: boolean;
  migrateToCloud: () => Promise<{ ok: boolean; before: number; after: number; imported: number; error?: string }>;
  refetch: () => Promise<void>;
}

const CustomersContext = createContext<Ctx | null>(null);

export function CustomersProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const list = useServerFn(listCustomers);
  const upsert = useServerFn(upsertCustomer);
  const removeFn = useServerFn(deleteCustomer);
  const migrate = useServerFn(migrateBackup);

  const [customers, setCustomers] = useState<Customer[]>(sampleCustomers);
  const [mode, setMode] = useState<Mode>("legacy");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const firstWrite = useRef(true);

  // Hydrate legacy data from localStorage (used pre-migration AND as the
  // source for the "Migrate to Cloud" button).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomers(parsed.map(normalizeCustomer));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist to localStorage only in legacy mode.
  useEffect(() => {
    if (!hydrated || mode !== "legacy") return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(customers)); } catch {}
    if (firstWrite.current) { firstWrite.current = false; return; }
    setSavedAt(Date.now());
  }, [customers, hydrated, mode]);

  const refetch = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await list();
      if (res.customers.length > 0) {
        setCustomers(res.customers.map(normalizeCustomer));
        setMode("cloud");
      } else {
        setMode("legacy");
      }
    } catch (e) {
      console.error("listCustomers failed", e);
    } finally {
      setLoading(false);
    }
  }, [session, list]);

  // When auth becomes ready, try to load from cloud.
  useEffect(() => {
    if (authLoading) return;
    if (!session) { setMode("legacy"); return; }
    refetch();
  }, [authLoading, session, refetch]);

  // --- Mutations ---
  const persist = useCallback(async (c: Customer) => {
    if (mode !== "cloud") return;
    try {
      await upsert({ data: { customer: c } });
      setSavedAt(Date.now());
    } catch (e) {
      console.error("upsertCustomer failed", e);
    }
  }, [mode, upsert]);

  const update = useCallback((id: string, patch: Partial<Customer>) => {
    setCustomers((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...patch };
        // Stamp when the opportunity status actually changes (drives sectioning).
        if (patch.status !== undefined && patch.status !== c.status) {
          merged.statusChangedAt = new Date().toISOString();
        }
        return merged;
      });
      const updated = next.find((c) => c.id === id);
      if (updated) persist(updated);
      return next;
    });
  }, [persist]);

  const add = useCallback((c?: Partial<Customer>) => {
    const newC = normalizeCustomer({
      id: `cus_${Date.now()}`,
      name: "New Customer",
      cluster: "Unknown",
      state: "Unknown",
      icpTier: "B",
      ...c,
    });
    setCustomers((prev) => [newC, ...prev]);
    persist(newC);
    return newC;
  }, [persist]);

  const duplicate = useCallback((id: string): Customer | null => {
    let dup: Customer | null = null;
    setCustomers((prev) => {
      const src = prev.find((c) => c.id === id);
      if (!src) return prev;
      dup = { ...src, id: `cus_${Date.now()}`, name: `${src.name} (Copy)` };
      const idx = prev.findIndex((c) => c.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
    if (dup) persist(dup);
    return dup;
  }, [persist]);

  const remove = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (mode === "cloud") {
      removeFn({ data: { id } }).catch((e) => console.error("deleteCustomer failed", e));
    }
  }, [mode, removeFn]);

  const setStatus = useCallback((id: string, status: OpportunityStatus) => {
    update(id, { status });
  }, [update]);

  const appendNote = useCallback((id: string, note: string) => {
    if (!note.trim()) return;
    const stamp = new Date().toISOString().slice(0, 10);
    setCustomers((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const prefix = c.notes ? c.notes + "\n" : "";
        return { ...c, notes: `${prefix}[${stamp}] ${note.trim()}` };
      });
      const updated = next.find((c) => c.id === id);
      if (updated) persist(updated);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    if (mode === "cloud") {
      console.warn("Reset is disabled in Cloud mode. Use the backend to delete data.");
      return;
    }
    setCustomers(sampleCustomers);
  }, [mode]);

  const exportData = useCallback(() => {
    return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), mode, customers }, null, 2);
  }, [customers, mode]);

  const importData = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const rows = Array.isArray(parsed) ? parsed : parsed?.customers;
      if (!Array.isArray(rows)) return { ok: false, error: "Invalid backup file: missing customers array." };
      const normalized = rows.map(normalizeCustomer);
      setCustomers(normalized);
      // If currently in cloud mode, push the imported set to cloud too.
      if (mode === "cloud") {
        migrate({ data: { customers: normalized } }).catch((e) => console.error("migrate on import failed", e));
      }
      return { ok: true, count: normalized.length };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to parse backup file." };
    }
  }, [mode, migrate]);

  const migrateToCloud = useCallback(async () => {
    if (!session) return { ok: false, before: 0, after: 0, imported: 0, error: "Sign in required." };
    try {
      const res = await migrate({ data: { customers } });
      if (res.ok) {
        setMode("cloud");
        await refetch();
      }
      return res;
    } catch (e) {
      return { ok: false, before: 0, after: 0, imported: 0, error: e instanceof Error ? e.message : "Migration failed" };
    }
  }, [session, migrate, customers, refetch]);

  return (
    <CustomersContext.Provider value={{
      customers, update, add, duplicate, remove, setStatus, appendNote, reset, savedAt,
      exportData, importData, mode, loading, migrateToCloud, refetch,
    }}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error("useCustomers must be used inside CustomersProvider");
  return ctx;
}
