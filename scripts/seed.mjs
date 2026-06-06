// Seed the MongoDB `customers` collection from src/data/customers.json.
// Run: npm run seed   (uses .env via node --env-file)
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, "../src/data/customers.json");

const uri = process.env.MONGODB_URI;
const dbName = process.env.APP_DB || "expansion_navigator";
if (!uri) {
  console.error("Missing MONGODB_URI. Add it to .env first.");
  process.exit(1);
}

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function normalize(raw) {
  const nextBestPitch =
    raw.nextBestPitch ??
    raw.finalPitch ??
    (Array.isArray(raw.suggestedOpportunities) && raw.suggestedOpportunities.length
      ? raw.suggestedOpportunities.slice(0, 2).join(" + ")
      : "");
  return {
    _id: raw.id,
    id: raw.id,
    name: raw.name ?? "",
    key: raw.key ?? "",
    cluster: raw.cluster ?? "",
    state: raw.state ?? "",
    icpTier: raw.icpTier ?? "B",
    turnover: num(raw.turnover),
    turnoverText: raw.turnoverText ?? "",
    castingType: raw.castingType ?? "",
    units: num(raw.units, 1),
    unitDetails: raw.unitDetails ?? "",
    adoption: num(raw.adoption),
    customerAge: num(raw.customerAge),
    noModules: num(raw.noModules),
    adoptionPoc: raw.adoptionPoc ?? "",
    salesPoc: raw.salesPoc ?? "",
    currentSystems: raw.currentSystems ?? [],
    hardwareInstalled: raw.hardwareInstalled ?? [],
    userLite: num(raw.userLite),
    userPro: num(raw.userPro),
    nextBestPitch,
    suggestedOpportunities: raw.suggestedOpportunities ?? [],
    expansionPath: raw.expansionPath ?? [],
    expansionType: raw.expansionType ?? "Operational",
    expansionMotion: raw.expansionMotion ?? "Discovery Call",
    siteSurveyRequired: !!raw.siteSurveyRequired,
    multiUnitOpportunity: !!raw.multiUnitOpportunity,
    upsellValue: num(raw.upsellValue),
    confidence: num(raw.confidence),
    owner: raw.owner ?? "",
    status: raw.status ?? "Identified",
    nextStep: raw.nextStep ?? "",
    notes: raw.notes ?? "",
  };
}

const raw = JSON.parse(readFileSync(dataPath, "utf8"));
const docs = (Array.isArray(raw) ? raw : raw.customers).map(normalize);

const client = new MongoClient(uri);
try {
  await client.connect();
  const coll = client.db(dbName).collection("customers");
  const before = await coll.countDocuments();
  const ops = docs.map((d) => ({
    replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
  }));
  const res = await coll.bulkWrite(ops, { ordered: false });
  const after = await coll.countDocuments();
  console.log(
    `Seed complete → db="${dbName}" customers: ${before} → ${after} ` +
      `(upserted ${res.upsertedCount}, modified ${res.modifiedCount}, from ${docs.length} rows)`,
  );
} finally {
  await client.close();
}
