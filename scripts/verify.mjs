import { MongoClient } from "mongodb";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
try {
  await client.connect();
  const app = client.db(process.env.APP_DB || "expansion_navigator");
  const src = client.db(process.env.ADOPTION_DB).collection(process.env.ADOPTION_COLLECTION);

  const norm = (s) => (s ?? "").toString().trim().toLowerCase();
  const custNames = (await app.collection("customers").find({}, { projection: { name: 1 } }).toArray()).map((c) => norm(c.name));
  const custSet = new Set(custNames);

  const srcDocs = await src.find({}, { projection: { customer_name: 1, adoption_: 1 } }).toArray();
  const srcNames = srcDocs.map((d) => norm(d.customer_name));
  const distinctSrc = new Set(srcNames);
  const matchedDistinct = [...distinctSrc].filter((n) => custSet.has(n));
  const unmatchedDistinct = [...distinctSrc].filter((n) => !custSet.has(n));

  console.log(`customers: ${custSet.size} | source rows: ${srcDocs.length} | distinct source names: ${distinctSrc.size}`);
  console.log(`distinct source names matched to a customer: ${matchedDistinct.length}`);
  console.log(`distinct source names NOT matched: ${unmatchedDistinct.length}`);
  if (unmatchedDistinct.length) console.log("  unmatched sample:", unmatchedDistinct.slice(0, 15));

  const withAdoption = await app.collection("customers").countDocuments({ adoption: { $gt: 0 } });
  console.log(`\ncustomers with adoption > 0 after sync: ${withAdoption}/${custSet.size}`);
  const sample = await app.collection("customers").find({}, { projection: { name: 1, adoption: 1, adoptionPoc: 1, cluster: 1, customerAge: 1 } }).limit(8).toArray();
  console.log("sample customers:");
  for (const c of sample) console.log(`  ${c.name} → adoption=${c.adoption} poc=${c.adoptionPoc} cluster=${c.cluster} age=${c.customerAge}`);
} finally {
  await client.close();
}
