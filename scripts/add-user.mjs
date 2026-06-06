// Create or update an app login user.
// Usage: npm run add-user -- <email> <password> ["Full Name"]
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const [email, password, name] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run add-user -- <email> <password> ["Full Name"]');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.APP_DB || "expansion_navigator";
if (!uri) {
  console.error("Missing MONGODB_URI. Add it to .env first.");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const users = client.db(dbName).collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  const passwordHash = await bcrypt.hash(password, 10);
  const normEmail = email.trim().toLowerCase();
  await users.updateOne(
    { email: normEmail },
    { $set: { email: normEmail, passwordHash, name: name || "" }, $setOnInsert: { createdAt: new Date().toISOString() } },
    { upsert: true },
  );
  const count = await users.countDocuments();
  console.log(`User "${normEmail}" saved. Total users: ${count}`);
} finally {
  await client.close();
}
