// Pull adoption scores from `deepak_sheet` and merge into customers by name.
// Only adoption-owned fields are written; expansion fields are never touched.
// Run: npm run sync:adoption
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

const uri = process.env.MONGODB_URI;
const appDbName = process.env.APP_DB || "expansion_navigator";
const srcDbName = process.env.ADOPTION_DB || "deepak_sheet";
const srcColl = process.env.ADOPTION_COLLECTION || "adoption_scores";
if (!uri) {
  console.error("Missing MONGODB_URI. Add it to .env first.");
  process.exit(1);
}

const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const numOrU = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(/[%,]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};
const pick = (doc, ...keys) => {
  for (const k of keys) if (doc[k] !== undefined && doc[k] !== null && doc[k] !== "") return doc[k];
  return undefined;
};

function toRow(doc) {
  const systems = pick(doc, "current_systems", "currentSystems", "Current Systems", "modules_list");
  return {
    customer_name: String(pick(doc, "customer_name", "customerName", "name", "Customer", "Customer Name") ?? ""),
    adoption: numOrU(pick(doc, "adoption", "adoptionScore", "adoption_percent", "Adoption %", "score")),
    no_modules: numOrU(pick(doc, "no_modules", "noModules", "No Modules", "modules")),
    current_systems: Array.isArray(systems)
      ? systems
      : typeof systems === "string" && systems
        ? systems.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
        : undefined,
    adoption_poc: pick(doc, "adoption_poc", "adoptionPoc", "Adoption POC"),
    sales_poc: pick(doc, "sales_poc", "salesPoc", "Sales POC"),
    customer_age: numOrU(pick(doc, "customer_age", "customerAge", "Customer Age", "age")),
    cluster: pick(doc, "cluster", "Cluster"),
    state: pick(doc, "state", "State"),
  };
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const appDb = client.db(appDbName);
  const srcDb = client.db(srcDbName);

  const docs = await srcDb.collection(srcColl).find({}).toArray();
  const rows = docs.map(toRow).filter((r) => r.customer_name);

  const customers = await appDb
    .collection("customers")
    .find({}, { projection: { _id: 1, name: 1 } })
    .toArray();
  const byName = new Map(customers.map((c) => [norm(c.name), c._id]));

  let updated = 0;
  const unmatched = [];
  for (const r of rows) {
    const id = byName.get(norm(r.customer_name));
    if (!id) {
      unmatched.push(r.customer_name);
      continue;
    }
    await appDb.collection("customers").updateOne(
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

  const run = {
    _id: randomUUID(),
    id: undefined,
    run_at: new Date().toISOString(),
    source: `deepak_sheet:${srcColl}`,
    user_email: "",
    file_name: srcColl,
    total_count: rows.length,
    updated_count: updated,
    new_count: 0,
    unmatched_count: unmatched.length,
    unmatched_names: unmatched,
  };
  run.id = run._id;
  await appDb.collection("sync_runs").insertOne(run);

  console.log(
    `Adoption sync from ${srcDbName}.${srcColl}: ${rows.length} source rows · ` +
      `${updated} updated · ${unmatched.length} unmatched`,
  );
  if (unmatched.length) console.log("Unmatched:", unmatched.slice(0, 20).join(", "), unmatched.length > 20 ? "…" : "");
} finally {
  await client.close();
}
