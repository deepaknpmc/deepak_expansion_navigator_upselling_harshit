// Server-only MongoDB client.
// The .server.ts suffix prevents Vite from bundling this into the client —
// the connection string never reaches the browser.
//
// Serverless-safe: the MongoClient (and its connection pool) is cached on
// globalThis so it survives across warm Vercel invocations instead of
// opening a new pool on every request.
import { MongoClient, type Db } from "mongodb";

const APP_DB = process.env.APP_DB || "expansion_navigator";
// Existing database that holds the adoption scores, matched by customer name.
const ADOPTION_DB = process.env.ADOPTION_DB || "deepak_sheet";

type GlobalWithMongo = typeof globalThis & {
  __mongoClientPromise?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Add your MongoDB Atlas connection string to .env (local) and the Vercel project settings.",
    );
  }
  const g = globalThis as GlobalWithMongo;
  if (!g.__mongoClientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 10 });
    g.__mongoClientPromise = client.connect();
  }
  return g.__mongoClientPromise;
}

/** The app's own database (customers, sync_runs, staged adoption records). */
export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(APP_DB);
}

/** The existing `deepak_sheet` database — read-only source for adoption scores. */
export async function getAdoptionSourceDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(ADOPTION_DB);
}

export const collections = {
  customers: "customers",
  syncRuns: "sync_runs",
  adoptionRecords: "adoption_records",
} as const;
