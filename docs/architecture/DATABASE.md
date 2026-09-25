# Database Plan

Schema: `supabase/migrations/20260925000000_clinical_core.sql` and `20260925000100_consultation_audio.sql`. Types: `lib/database.types.ts`.

| Table | Purpose | Client writes |
| --- | --- | --- |
| `profiles` | One per auth user (created by a trigger). `is_clinician` gates all clinical data. | Update `full_name` only |
| `patients` | Fictional demographics | Insert and update demographics; no delete |
| `medications` | Per patient; `status` active or stopped | Insert and update; no delete |
| `medical_conditions` | Per patient; `status` active or resolved | Insert and update; no delete |
| `consultations` | Status, audio path, raw transcript, AI draft, final note, finaliser | Insert `patient_id` and `consulted_at`; update `status`, `audio_path`, `transcript`, `generated_draft`, `final_note` |
| `patients.nhi` | Optional NHI, upper-case, unique, format-checked (`20260926010000_nhi_and_roster.sql`). Demo data uses the Z-prefixed test range only | Insert and update |
| `roster_shifts` | Named staff shifts by area (not linked to accounts); max 24 h each | Insert, update and delete |
| `tasks` | Follow-ups from finalised notes (`source = note`) or added by hand; shared by all clinicians (`20260926000000_tasks.sql`) | Insert `patient_id`, `consultation_id`, `title`, `details`, `due_at`, `source`, `assigned_to`; update `title`, `details`, `due_at`, `status`, `assigned_to`; no delete |
| `storage: consultation-audio` | Private raw audio, max 25 MB | Upload and read only |

## Rules

- Every public table gets a migration, grants, and row-level security policies.
- Clinical access requires `public.is_clinician()`. All clinicians share all patients for the MVP. Only an administrator can set `profiles.is_clinician`.
- The database fills `created_by` and `doctor_id` from `auth.uid()`, and clients cannot submit them.
- `guard_consultation_update` enforces the review rules in the database:
  - `transcript`, `generated_draft`, and `audio_path` are write-once.
  - `status = 'finalised'` requires `final_note`, and the database stamps `finalised_by` and `finalised_at`.
  - A finalised consultation is read-only.
- Notes are stored as JSON matching `clinicalNoteSchema` (`lib/validation.ts`). An unparseable stored note is surfaced as missing.
- Use fictional/demo data in local seeds (`supabase/seed.sql`) and tests only.

## Local demo setup

```sh
pnpm db:start
pnpm db:reset         # applies migrations and fictional seed patients (local only)
pnpm db:seed-users    # clinician.a@example.com and clinician.b@example.com; codes arrive in the local inbox
```
