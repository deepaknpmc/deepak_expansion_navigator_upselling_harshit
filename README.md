# MetalCloud Expansion Navigator

Internal expansion / upselling intelligence dashboard. TanStack Start (React 19)
+ MongoDB, deployed on Vercel.

## Architecture

- **Frontend/SSR:** TanStack Start, built with Vite + Nitro (`vercel` preset).
- **Data:** MongoDB. Two databases on the same Atlas cluster:
  - `expansion_navigator` (app data): `customers`, `sync_runs`, `adoption_records`.
  - `deepak_sheet` (existing, read-only source): adoption scores, matched into
    customers **by customer name**.
- **Auth:** none (open internal tool). Protect via Vercel Password Protection.

Customers are stored as **one document each**, shaped like the `Customer` type in
`src/data/sample.ts` (no joins). Server functions live in `src/lib/*.functions.ts`.

## Environment variables

Copy `.env.example` → `.env` and fill in:

| Var | Meaning |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (`mongodb+srv://…`) |
| `APP_DB` | App database name (default `expansion_navigator`) |
| `ADOPTION_DB` | Existing adoption-source DB (default `deepak_sheet`) |
| `ADOPTION_COLLECTION` | Collection in `ADOPTION_DB` holding adoption rows |

Set the same vars in the Vercel project settings. Allow Vercel egress in Atlas
Network Access (or `0.0.0.0/0`).

## Scripts

```bash
npm run dev              # local dev server
npm run build            # production build → .vercel/output
npm run seed             # load the 125 customers into MongoDB
npm run inspect:source   # list deepak_sheet collections + sample fields
npm run sync:adoption    # pull adoption scores from deepak_sheet into customers
```

`seed`, `inspect:source`, and `sync:adoption` read `.env` via Node's `--env-file`.

## Adoption sync

`deepak_sheet` is the source of truth for adoption-owned fields
(`adoption`, `noModules`, `currentSystems`, `adoptionPoc`, `salesPoc`,
`customerAge`, `cluster`, `state`). Expansion-owned fields (pitch, confidence,
upsell value, status, notes, …) are **never** touched by a sync.

Two ways to sync:
1. **In-app** (Settings → Adoption Sync): upload a CSV, then "Sync".
2. **From deepak_sheet**: `npm run sync:adoption` (or the `syncAdoptionFromSource`
   server function). Field names are auto-mapped; adjust `sourceDocToRow` in
   `src/lib/adoption.functions.ts` if the source schema differs.

## Deploy (Vercel)

1. Push to GitHub.
2. Import the repo into the Vercel project, framework preset **Other**,
   build command `npm run build` (output is the Build Output API at
   `.vercel/output`, produced by the Nitro Vercel preset).
3. Add the env vars above. Deploy.
4. (Recommended) Settings → Deployment Protection → enable Password Protection.
