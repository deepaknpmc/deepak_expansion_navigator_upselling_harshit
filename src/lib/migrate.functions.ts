import { createServerFn } from "@tanstack/react-start";
import { getDb, collections } from "@/integrations/mongo/client.server";
import type { Customer } from "@/data/sample";

/**
 * Bulk import customers (upsert by id). Returns counts before and after.
 * Idempotent: safe to re-run; existing customer documents are replaced.
 */
export const migrateBackup = createServerFn({ method: "POST" })
  .inputValidator((input: { customers: Customer[] }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    const coll = db.collection(collections.customers);

    const before = await coll.countDocuments();

    const customers = data.customers;
    if (!Array.isArray(customers) || customers.length === 0) {
      return { ok: false, before, after: before, imported: 0, error: "No customers to import." };
    }

    const ops = customers.map((c) => ({
      replaceOne: {
        filter: { _id: c.id },
        replacement: { ...c, _id: c.id },
        upsert: true,
      },
    }));

    // bulkWrite handles the full set in one round-trip; chunk for safety on large sets.
    const chunk = 500;
    for (let i = 0; i < ops.length; i += chunk) {
      await coll.bulkWrite(ops.slice(i, i + chunk) as any, { ordered: false });
    }

    const after = await coll.countDocuments();
    return { ok: true, before, after, imported: customers.length };
  });
