// Inspect the existing `deepak_sheet` database: list collections and show a
// sample document + field names from each, so we can map adoption fields.
// Run: npm run inspect:source
import { MongoClient } from "mongodb";
import dns from "node:dns";

// Node's bundled c-ares resolver can fail SRV lookups (querySrv ECONNREFUSED)
// on some Windows/corporate networks even when the OS resolver works. Point it
// at public DNS for local script runs. (Not needed on Vercel.)
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGODB_URI;
const dbName = process.env.ADOPTION_DB || "deepak_sheet";
if (!uri) {
  console.error("Missing MONGODB_URI. Add it to .env first.");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);
  const colls = await db.listCollections().toArray();
  console.log(`\nDatabase "${dbName}" has ${colls.length} collection(s):\n`);
  for (const { name } of colls) {
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    const sample = await coll.findOne({});
    console.log(`── ${name}  (${count} docs)`);
    if (sample) {
      console.log("   fields:", Object.keys(sample).join(", "));
      console.log("   sample:", JSON.stringify(sample, null, 2).split("\n").join("\n   "));
    }
    console.log("");
  }
} finally {
  await client.close();
}
