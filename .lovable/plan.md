## Adoption Sync Architecture

Establishes the **Revised Adoption Score sheet** as the operational source of truth for adoption data, while keeping all expansion intelligence owned by the Expansion OS. No UI redesign — one new card in Settings.

### Field ownership (locked contract)

| Owned by Adoption source | Owned by Expansion OS (never overwritten) |
|---|---|
| Adoption % | Final Pitch (`nextBestPitch`) |
| No. Modules | Confidence |
| Current Systems | Upsell Value |
| Adoption POC | Status |
| Sales POC | Notes |
| Customer Age | Expansion Type |
| Cluster | Expansion Motion |
| State | Site Survey Required |
|  | Opportunity Owner (`owner`) |

### 1. Database — new `adoption_records` table

Source-agnostic staging table. Each row = one customer's latest adoption snapshot from the upstream source. Decoupled from `customers` so a future Google Sheet / Excel connector writes here without schema changes.

```
adoption_records
├── id (uuid, pk)
├── customer_name (text, unique, normalized lower+trim)
├── adoption (numeric)
├── no_modules (int)
├── current_systems (text[])
├── adoption_poc (text)
├── sales_poc (text)
├── customer_age (int)
├── cluster (text)
├── state (text)
├── source (text, default 'manual_upload')   -- 'manual_upload' | 'google_sheets' | 'excel'
├── source_row_id (text, nullable)            -- external row id for re-sync
├── synced_at (timestamptz, nullable)         -- last time merged into customers
└── created_at, updated_at
```

Plus a `sync_runs` table to record each sync's report:

```
sync_runs
├── id (uuid), run_at (timestamptz)
├── source (text)
├── updated_count (int)
├── new_count (int)
├── unmatched_count (int)
└── unmatched_names (text[])
```

RLS: shared workspace (same model as existing tables) — all authenticated users CRUD, service_role full.

### 2. Sync workflow (`syncAdoptionData` server function)

Pure server-side merge logic, source-independent:

```
text
For each row in adoption_records:
  match = customers WHERE lower(trim(name)) = lower(trim(customer_name))
  if match found:
    UPDATE customers SET
      adoption, no_modules, customer_age, cluster, state,
      adoption_poc, sales_poc
    UPDATE customer_modules
      DELETE WHERE customer_id = match.id AND kind = 'current'
      INSERT current_systems as kind='current'
    -- NEVER touch opportunities row, notes_legacy, owner, next_step
    updated_count++
  else:
    new_count++  (recorded as unmatched, NOT auto-created)
    unmatched_names += customer_name
  UPDATE adoption_records.synced_at = now()
Insert sync_runs row, return report
```

**Critical invariant**: the SQL update statement enumerates only the 8 adoption-owned columns. The opportunities table is never touched.

"New Customers" vs "Unmatched": both are rows in the sheet not in customers. We surface them as **Unmatched** (require manual review) and as **New Candidates** the user can promote to real customers from the UI in a future iteration. For this phase, they're listed — not auto-created — to protect the integrity of expansion data.

### 3. Server functions (in `src/lib/adoption.functions.ts`)

- `listAdoptionRecords()` — for inspection
- `uploadAdoptionRecords({ rows, source })` — upsert into `adoption_records` keyed by normalized name
- `syncAdoptionData()` — runs merge, writes `sync_runs`, returns `{ updated, new, unmatched: string[], runAt }`
- `getLastSyncRun()` — for the "Last Sync Timestamp" display

### 4. Settings UI — new "Adoption Sync" card

Added above Backup & Restore. Three actions + a status block:

- **Upload Adoption CSV** — file input, parses headers (`Customer Name, Adoption %, No Modules, Current Systems, Adoption POC, Sales POC, Customer Age, Cluster, State`), stages into `adoption_records`.
- **Run Sync** — calls `syncAdoptionData`, shows toast + report.
- **Last sync**: timestamp + counts (Updated / New / Unmatched).
- **Unmatched list**: collapsible list of customer names in the sheet but not in the app — so user can rename or add them.

The CSV path is the bootstrap source. The same `adoption_records` table will be written by a future Google Sheets / Excel connector with **zero schema changes** — only a new ingestion server function.

### 5. Future-proofing

A future Google Sheets/Excel connector will:
1. Read source rows via the connector gateway
2. Call the same `uploadAdoptionRecords` function with `source='google_sheets'`
3. Trigger `syncAdoptionData`

No database or merge-logic changes required.

### Out of scope (this phase)

- Auto-creating customers from unmatched rows (deliberate — preserves expansion data integrity).
- Live Google Sheets connector wiring (architecture is ready; connector flow is a follow-up).
- Scheduled/cron sync (manual trigger only this phase).
- Changes to existing customer screens, opportunity matrix, or analytics.

### Files

**New:**
- `supabase/migrations/<ts>_adoption_sync.sql` — tables, RLS, grants
- `src/lib/adoption.functions.ts` — server functions
- `src/components/settings/AdoptionSyncCard.tsx` — UI card

**Edited:**
- `src/routes/settings.tsx` — mount the new card
- `src/integrations/supabase/types.ts` — regenerated post-migration
