import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import {
  getDb,
  getAdoptionSourceDb,
  collections,
} from "@/integrations/mongo/client.server";
import type { Db } from "mongodb";

/**
 * Adoption Sync architecture (MongoDB).
 *
 * Adoption-owned fields (sourced from the adoption score data):
 *   adoption, noModules, currentSystems, adoptionPoc, salesPoc,
 *   customerAge, cluster, state
 *
 * Expansion-owned fields (NEVER touched by sync):
 *   nextBestPitch, confidence, upsellValue, status, notes,
 *   expansionType, expansionMotion, siteSurveyRequired, owner.
 *
 * Two sources feed the same merge:
 *   1. CSV upload  → staged in the `adoption_records` collection, then synced.
 *   2. `deepak_sheet` Mongo DB → pulled live and synced (matched by name).
 */

export type AdoptionRow = {
  customer_name: string;
  adoption?: number;
  no_modules?: number;
  current_systems?: string[];
  adoption_poc?: string;
  sales_poc?: string;
  customer_age?: number;
  cluster?: string;
  state?: string;
  source_row_id?: string | null;
};

type SyncReport = {
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

const norm = (s: string) => (s ?? "").trim().toLowerCase();

/**
 * Core merge: apply adoption rows onto customer documents, matching by
 * normalized name. Only adoption-owned fields are written. Logs a sync_run.
 */
async function mergeAdoptionRows(
  db: Db,
  rows: AdoptionRow[],
  meta: { source: string; file_name?: string; user_email?: string },
): Promise<SyncReport> {
  const customers = await db
    .collection(collections.customers)
    .find({}, { projection: { _id: 1, name: 1 } })
    .toArray();

  const byName = new Map<string, string>();
  customers.forEach((c: any) => byName.set(norm(c.name ?? ""), c._id));

  let updated = 0;
  const unmatched: string[] = [];

  for (const r of rows) {
    if (!r.customer_name || !r.customer_name.trim()) continue;
    const id = byName.get(norm(r.customer_name));
    if (!id) {
      unmatched.push(r.customer_name);
      continue;
    }
    await db.collection(collections.customers).updateOne(
      { _id: id },
      {
        $set: {
          adoption: r.adoption ?? 0,
          noModules: r.no_modules ?? 0,
          currentSystems: r.current_systems ?? [],
          adoptionPoc: r.adoption_poc ?? "",
          salesPoc: r.sales_poc ?? "",
          customerAge: r.customer_age ?? 0,
          cluster: r.cluster ?? "",
          state: r.state ?? "",
        },
      },
    );
    updated++;
  }

  const report: SyncReport = {
    id: randomUUID(),
    run_at: new Date().toISOString(),
    source: meta.source,
    user_email: meta.user_email ?? "",
    file_name: meta.file_name ?? "",
    total_count: rows.length,
    updated_count: updated,
    new_count: 0,
    unmatched_count: unmatched.length,
    unmatched_names: unmatched,
  };
  await db.collection(collections.syncRuns).insertOne({ ...report, _id: report.id } as any);
  return report;
}

/** Normalize an arbitrary deepak_sheet document into an AdoptionRow. */
function sourceDocToRow(doc: any): AdoptionRow {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (doc[k] !== undefined && doc[k] !== null && doc[k] !== "") return doc[k];
    }
    return undefined;
  };
  const num = (v: any) => {
    if (v === undefined || v === null) return undefined;
    const n = Number(String(v).replace(/[%,]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };
  const systems = pick("current_systems", "currentSystems", "Current Systems", "modules_list");
  return {
    customer_name: String(
      pick("customer_name", "customerName", "name", "Customer", "Customer Name") ?? "",
    ),
    adoption: num(pick("adoption", "adoptionScore", "adoption_percent", "Adoption %", "score")),
    no_modules: num(pick("no_modules", "noModules", "No Modules", "modules")),
    current_systems: Array.isArray(systems)
      ? systems
      : typeof systems === "string" && systems
        ? systems.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
        : undefined,
    adoption_poc: pick("adoption_poc", "adoptionPoc", "Adoption POC") as string | undefined,
    sales_poc: pick("sales_poc", "salesPoc", "Sales POC") as string | undefined,
    customer_age: num(pick("customer_age", "customerAge", "Customer Age", "age")),
    cluster: pick("cluster", "Cluster") as string | undefined,
    state: pick("state", "State") as string | undefined,
  };
}

// ---- CSV staging path -------------------------------------------------------

export const uploadAdoptionRecords = createServerFn({ method: "POST" })
  .inputValidator((input: { rows: AdoptionRow[]; source?: string }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    const source = data.source ?? "manual_upload";
    const payload = data.rows
      .filter((r) => r.customer_name && r.customer_name.trim().length > 0)
      .map((r) => ({
        _id: r.customer_name.trim().toLowerCase(),
        customer_name: r.customer_name.trim(),
        adoption: r.adoption ?? 0,
        no_modules: r.no_modules ?? 0,
        current_systems: r.current_systems ?? [],
        adoption_poc: r.adoption_poc ?? "",
        sales_poc: r.sales_poc ?? "",
        customer_age: r.customer_age ?? 0,
        cluster: r.cluster ?? "",
        state: r.state ?? "",
        source,
        source_row_id: r.source_row_id ?? null,
      }));

    if (!payload.length) return { staged: 0 };

    const ops = payload.map((p) => ({
      replaceOne: { filter: { _id: p._id }, replacement: p, upsert: true },
    }));
    await db.collection(collections.adoptionRecords).bulkWrite(ops as any, { ordered: false });
    return { staged: payload.length };
  });

export const listAdoptionRecords = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getDb();
  const records = await db
    .collection(collections.adoptionRecords)
    .find({}, { sort: { customer_name: 1 } })
    .toArray();
  return { records };
});

export const getLastSyncRun = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getDb();
  const run = await db
    .collection(collections.syncRuns)
    .findOne({}, { sort: { run_at: -1 } });
  return { run };
});

export const listSyncRuns = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getDb();
  const runs = await db
    .collection(collections.syncRuns)
    .find({}, { sort: { run_at: -1 }, limit: 200 })
    .toArray();
  return { runs };
});

/** Sync the CSV-staged adoption_records into customers. */
export const syncAdoptionData = createServerFn({ method: "POST" })
  .inputValidator((input: { source?: string; file_name?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const db = await getDb();
    const records = await db.collection(collections.adoptionRecords).find({}).toArray();
    const rows: AdoptionRow[] = records.map((r: any) => ({
      customer_name: r.customer_name,
      adoption: r.adoption,
      no_modules: r.no_modules,
      current_systems: r.current_systems,
      adoption_poc: r.adoption_poc,
      sales_poc: r.sales_poc,
      customer_age: r.customer_age,
      cluster: r.cluster,
      state: r.state,
    }));
    const run = await mergeAdoptionRows(db, rows, {
      source: data.source ?? "manual_upload",
      file_name: data.file_name ?? "",
    });
    return { run };
  });

/**
 * Pull adoption scores directly from the existing `deepak_sheet` Mongo DB
 * and merge into customers (matched by name). This is the live cross-DB sync.
 */
export const syncAdoptionFromSource = createServerFn({ method: "POST" })
  .inputValidator((input: { collection?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const sourceDb = await getAdoptionSourceDb();
    const appDb = await getDb();
    const collName = data.collection || process.env.ADOPTION_COLLECTION || "adoption_scores";

    const docs = await sourceDb.collection(collName).find({}).toArray();
    const rows = docs.map(sourceDocToRow).filter((r) => r.customer_name);

    const run = await mergeAdoptionRows(appDb, rows, {
      source: `deepak_sheet:${collName}`,
      file_name: collName,
    });
    return { run };
  });
