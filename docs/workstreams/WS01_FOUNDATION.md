# WS01: Foundation, Authentication, and Database

Own authentication, protected routes, Supabase access, environment variables, migrations, grants, RLS, and demo users/data.

**Deliverable:** an authenticated clinician can retrieve a patient and consultation records.

**Primary references:** `PROJECT_MASTER.md`, `docs/architecture/DATABASE.md`, `lib/auth.ts`, `lib/supabase/`.

## Access model

- Every signed-in user gets a `profiles` row, created automatically by a trigger on `auth.users`.
- Clinical data is visible only when `profiles.is_clinician = true`. Users cannot grant this to themselves: it is not in the column grants, so it can only be set with Studio, the service role, or `pnpm db:seed-users`.
- All clinicians share all patients (the MVP has no care-team permissions). `public.is_clinician()` is the single RLS predicate.
- Ownership columns (`created_by`, `doctor_id`) default to `auth.uid()`. The policies reject a submitted user ID that doesn't match.

## Phase 1: schema and read path (merged)

| Task | Files | Done |
| --- | --- | --- |
| Clinical schema: `profiles`, `patients`, `medications`, `medical_conditions`, `consultations` with constraints, grants, and RLS | `supabase/migrations/20260925000000_clinical_core.sql` | ✅ |
| Consultation guard trigger: immutable transcript and draft, finalisation stamps, read-only once finalised | same migration | ✅ |
| Private `consultation-audio` storage bucket: clinicians can read and upload, not overwrite or delete | `supabase/migrations/20260925000100_consultation_audio.sql`, `supabase/config.toml` | ✅ |
| Hand-written database types matching the migration (regenerate with `pnpm db:types` once Docker is available) | `lib/database.types.ts` | ✅ |
| Clinician guard for pages and API routes | `lib/auth.ts`, `lib/api.ts`, `app/not-authorised/page.tsx` | ✅ |
| Session refresh and redirects for `/patients`, `/consultations`, `/api` | `proxy.ts` | ✅ |
| Row-to-domain mappers and read queries | `lib/data/mappers.ts`, `lib/data/queries.ts` | ✅ |
| Read API: `GET /api/patients`, `/api/patients/:id`, `/api/patients/:id/consultations`, `/api/consultations/:id` | `app/api/**/route.ts` | ✅ |
| Validation: patient search, clinical note schema | `lib/validation.ts` | ✅ |
| Fictional seed patients, and a local-only script that creates two demo clinicians | `supabase/seed.sql`, `scripts/seed-demo-users.ts` | ✅ |
| Unit tests for mappers and schemas; integration test covering clinician sharing, non-clinician denial, and guard triggers | `tests/clinical.test.ts`, `scripts/test-integration.ts` | ✅ |

## Phase 2: support the other workstreams

- Review migrations that WS02, WS03, and WS04 need. Any schema change goes through a new migration, never an edit to a merged one.
- Run `pnpm db:types` against the local stack and commit the result, replacing the hand-written types.
- Change the post-login redirect from `/ideas` to `/patients` once WS02's dashboard exists, then retire the ideas example.
- Hosted setup:
  - Apply the migrations with `supabase db push`.
  - Set `is_clinician` for the two demo accounts in Studio (SQL below).
  - Confirm the storage bucket exists.

```sql
update public.profiles set is_clinician = true
where id in (select id from auth.users where email in ('clinician.a@example.com', 'clinician.b@example.com'));
```

## Verification (phase 1)

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally.
- The migrations and seed were applied to a real Postgres 17. Twenty-eight grant, RLS, trigger, and storage-policy checks passed as simulated clinician, non-clinician, and anonymous users.
- The full Supabase and HTTP integration test (`pnpm test:integration`) runs in CI.

## Acceptance

- The two demo clinicians both see the same seeded patient and each other's consultations.
- A signed-in non-clinician gets `403` from the API and the "not authorised" page in the UI. An anonymous user gets `401` from the API or is redirected to `/login`.
- Updating a written transcript, or anything on a finalised consultation, fails at the database, even when called directly with the publishable key.
