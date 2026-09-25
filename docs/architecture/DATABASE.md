# Database Plan

The initial schema will contain `profiles`, `patients`, `consultations`, `medications`, and `medical_conditions`.

## Rules

- Every public table gets a migration, grants, and row-level security policies.
- Patient and consultation access is limited to authenticated clinicians for the MVP.
- A consultation stores its status, raw transcript, generated draft, final note, creator, and finaliser timestamps.
- Raw transcripts are immutable after generation.
- Use fictional/demo data in local seeds and tests only.

The first schema migration should be added after the shared contracts have been reviewed. Keep the existing starter migration intact.