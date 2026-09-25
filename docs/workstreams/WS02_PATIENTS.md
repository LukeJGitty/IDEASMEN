# WS02: Patient Management

Own patient search, patient creation/editing, the patient dashboard, medications, medical history, and the consultation timeline.

**Deliverable:** a clinician can find or create a fictional patient and view their record.

Use the shared contracts in `types/` and the API contract in `docs/architecture/API_CONTRACTS.md`.

## Builds on (from WS01)

- `requireClinician()` for every page.
- `searchPatients`, `getPatientRecord`, and `listConsultations` from `lib/data/queries.ts`.
- `patientSearchSchema` and `idSchema` from `lib/validation.ts`.
- Tables `patients`, `medications`, `medical_conditions`, `consultations`. The database fills `created_by` and `doctor_id`, so never send them.

## Tasks

1. **Patient search page** (`app/patients/page.tsx`, `components/patients/patient-search.tsx`).
   - A GET form with a `q` param, rendered by a Server Component with `searchPatients`.
   - Show empty, no-results, and error states.
   - Switch the post-login redirect in `app/login/actions.ts` to `/patients` (coordinate with WS01).
2. **Create and edit patient.**
   - Add `patientSchema` to `lib/validation.ts`.
   - Server Actions `createPatient` and `updatePatient` in `app/patients/actions.ts`.
   - Pages `app/patients/new/page.tsx` and an edit form on the dashboard.
   - Also expose `POST /api/patients` and `PATCH /api/patients/:id` as thin wrappers over the same validation.
3. **Patient dashboard** (`app/patients/[id]/page.tsx`).
   - Header with name, date of birth, and contact details.
   - Panels for active medications and conditions (`components/patients/medication-list.tsx`, `condition-list.tsx`).
   - Add and stop medications, and add and resolve conditions, using Server Actions with `medicationSchema` and `conditionSchema`.
4. **Consultation timeline** (`components/patients/consultation-timeline.tsx`).
   - List consultations newest first with status badges.
   - Show the final note summary for finalised consultations, and a visible "AI draft, not reviewed" label for anything else.
5. **New consultation button.**
   - A Server Action inserts `{ patient_id }` (status defaults to `recording`) and redirects to `/consultations/:id`, the page WS03 owns.
   - Add `POST /api/consultations`.

## Acceptance

- Search "Aroha" or "Tane" (seed patients) and open the dashboard.
- Create a new patient, reload, and find it by name.
- Clinician B sees the patient that clinician A created.
- A finalised consultation appears on the timeline after reload.

## Out of scope

Deleting patients, merging duplicates, and patient portals.
