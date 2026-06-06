import { MongoClient } from "mongodb";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
try {
  await client.connect();
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();
  for (const d of databases) {
    const colls = await client.db(d.name).listCollections().toArray();
    console.log(`\nDB: ${d.name}`);
    for (const c of colls) {
      const n = await client.db(d.name).collection(c.name).countDocuments();
      console.log(`   - ${c.name} (${n} docs)`);
    }
    if (!colls.length) console.log("   (no collections)");
  }
} finally {
  await client.close();
}
