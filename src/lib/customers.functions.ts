import { createServerFn } from "@tanstack/react-start";
import { getDb, collections } from "@/integrations/mongo/client.server";
import type { Customer } from "@/data/sample";

/**
 * MongoDB-backed customer store.
 *
 * One document per customer, shaped exactly like the `Customer` type used
 * across the app (currentSystems[], hardwareInstalled[], status, confidence,
 * upsellValue, nextBestPitch, notes, …). `_id` mirrors `customer.id` so
 * upserts are idempotent and there are no joins to manage.
 */

type CustomerDoc = Customer & { _id: string };

function toDoc(c: Customer): CustomerDoc {
  return { ...c, _id: c.id };
}

function fromDoc(doc: any): Customer {
  const { _id, ...rest } = doc ?? {};
  return rest as Customer;
}

/** Fetch the entire shared workspace. */
export const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getDb();
  const docs = await db
    .collection<CustomerDoc>(collections.customers)
    .find({}, { sort: { name: 1 } })
    .toArray();
  return { customers: docs.map(fromDoc) };
});

/** Total count of customers (used for pre/post verification). */
export const countCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getDb();
  const count = await db.collection(collections.customers).countDocuments();
  return { count };
});

/** Upsert one customer. Used for inline edits, add, duplicate. */
export const upsertCustomer = createServerFn({ method: "POST" })
  .inputValidator((input: { customer: Customer }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    const c = data.customer;
    await db
      .collection<CustomerDoc>(collections.customers)
      .replaceOne({ _id: c.id }, toDoc(c), { upsert: true });
    return { ok: true };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    await db.collection(collections.customers).deleteOne({ _id: data.id });
    return { ok: true };
  });
