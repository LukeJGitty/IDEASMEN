# Workstream Plan

Five workstreams deliver the MVP flow in `PROJECT_MASTER.md`:

`Login -> Patient search -> Patient dashboard -> New consultation -> Record -> Transcribe -> Generate note -> Review -> Finalise -> Patient timeline`

| Workstream | Owns | Depends on | Unblocks |
| --- | --- | --- | --- |
| [WS01 Foundation](WS01_FOUNDATION.md) | Schema, RLS, auth guard, data layer, read APIs, seed data | — | Everyone |
| [WS02 Patients](WS02_PATIENTS.md) | `/patients` pages, patient + consultation creation, timeline | WS01 schema and data layer | WS03 (needs a consultation to record into) |
| [WS03 Recording & Transcription](WS03_RECORDING_TRANSCRIPTION.md) | Recorder UI, audio upload, `/api/transcribe` | WS01 storage bucket, WS02 consultation creation | WS04 (needs a transcript) |
| [WS04 AI Notes](WS04_AI_NOTES.md) | `/api/generate-note`, review editor, finalisation | WS01 guard triggers, WS03 transcript | WS05 |
| [WS05 Integration & QA](WS05_INTEGRATION_QA.md) | End-to-end checks, demo script, deployment | All | Demo |

## Status

| Workstream | Status | Start here |
| --- | --- | --- |
| WS01 Foundation | Phase 1 merged: schema, RLS, auth guard, read API, seed data | Phase 2 list in [WS01](WS01_FOUNDATION.md) |
| WS02 Patients | **Ready to start** | Task 1 in [WS02](WS02_PATIENTS.md) |
| WS03 Recording & Transcription | In progress on `ws03-recording`: all tasks built on the mock provider | Manual browser check, then the real provider once approved |
| WS04 AI Notes | Tasks 1 to 5 done on `ws04-notes`, awaiting review | [WS04](WS04_AI_NOTES.md) status section |
| WS05 Integration & QA | Ongoing | Task 2 |

## Pick up a workstream

### 1. One-time setup

You need the following:
- **Node.js 22+** (`node -v`).
- **pnpm 10**: run `corepack enable`, and the version pinned in `package.json` is used automatically.
- **Docker Desktop**, running. Local Supabase needs it.

```sh
git clone https://github.com/LukeJGitty/IDEASMEN.git && cd IDEASMEN
pnpm install
cp .env.example .env.local
pnpm db:start                 # first run downloads images (several minutes)
pnpm supabase status          # copy API URL + publishable key into .env.local
pnpm db:reset                 # local only: applies migrations + fictional seed patients
pnpm db:seed-users            # creates clinician.a@example.com and clinician.b@example.com
pnpm dev
```

Sign in at http://localhost:3000/login as `clinician.a@example.com`. The code arrives in the local inbox at http://127.0.0.1:55434.

To check you're connected, open http://localhost:3000/api/patients in the same browser. It should return the three seed patients as JSON.

If `pnpm db:start` complains about the Supabase CLI binary, run `pnpm approve-builds`, allow `supabase`, and then run `pnpm install` again.

### 2. Start work

```sh
git checkout main && git pull
git checkout -b ws02-patients        # one branch per workstream (ws03-recording, ws04-notes, ...)
```

1. Read `PROJECT_MASTER.md`, then your `WS0x_*.md` plan, then the two docs in `docs/architecture/`.
2. Work through the tasks in order. Tick them off in your plan file as they land, like WS01 does.
3. Reuse what WS01 provides rather than writing your own:

   | Need | Use |
   | --- | --- |
   | Protect a page or Server Action | `const { supabase, userId } = await requireClinician()` from `lib/auth.ts` |
   | Protect an API route | `const auth = await authenticateClinician(); if (!auth.ok) return apiError(auth.status);` then `apiData(...)` from `lib/api.ts` |
   | Read patients or consultations | `searchPatients`, `getPatientRecord`, `listConsultations`, `getConsultation` in `lib/data/queries.ts` |
   | Turn database rows into app types | `lib/data/mappers.ts` |
   | Validate input | `lib/validation.ts` (add your schemas here, next to the existing ones) |
   | Clinical note shape | `clinicalNoteSchema` / `ClinicalNote` |

4. Never send `created_by`, `doctor_id`, `finalised_by`, or `finalised_at`. The database fills them and rejects client values.
5. Need a schema change? Run `pnpm supabase migration new <name>` and never edit a merged migration. Add grants and RLS alongside the change, and add a check to `scripts/test-integration.ts`. Then run `pnpm db:reset && pnpm db:types` and commit the regenerated `lib/database.types.ts`. Tell WS01 in your PR.

### 3. Before you open a PR

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:integration        # needs the local stack running
```

Push your branch and open a PR into `main`. CI (`.github/workflows/ci.yml`) runs all of the above, including the Docker integration test. Merge only when it's green.

## Sequencing

1. **WS01 phase 1 lands first.** It fixes the schema and the TypeScript contracts, so the other workstreams can start against real tables instead of mocks.
2. **WS02, WS03, and WS04 then run in parallel.** WS03 and WS04 can develop against a consultation row inserted from Studio or the seed until WS02's "New consultation" button exists.
3. **WS05 integrates continuously.** It adds each step to the end-to-end check as it merges, rather than waiting for the end.

## Frozen contracts (change only by agreement)

These are owned by WS01. Changing one breaks other workstreams, so raise it first.

- **Tables and columns:** `supabase/migrations/20260925000000_clinical_core.sql` and `lib/database.types.ts`.
- **Domain types:** `types/patient.ts`, `types/consultation.ts`, `types/medication.ts`, and the row mappers in `lib/data/mappers.ts`.
- **Clinical note shape:** `clinicalNoteSchema` in `lib/validation.ts`. WS04 generates it, validates edits with it, and the database stores it as JSON.
- **Auth:**
  - Pages call `requireClinician()` from `lib/auth.ts`.
  - API routes call `authenticateClinician()` and return `apiError` from `lib/api.ts` when it fails.
- **API envelope:** success is `{ "data": ... }` and failure is `{ "error": "message" }`. See `docs/architecture/API_CONTRACTS.md`.
- **Consultation lifecycle:** `recording -> uploading -> transcribing -> draft_generated -> reviewing -> finalised`. The database enforces three rules:
  - The transcript and generated draft cannot change once written.
  - `finalised` requires a `final_note`, and the database stamps `finalised_by` and `finalised_at`.
  - A finalised consultation is read-only.

## Definition of done (every workstream)

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass. `pnpm test:integration` also passes when Docker is available.
- New tables or policies come with a migration, explicit grants, RLS, and a two-account access check in `scripts/test-integration.ts`.
- Provider API keys stay server-side. No paid provider is enabled without the owner's approval (see `AGENTS.md`).
- Only fictional patient data is used.
