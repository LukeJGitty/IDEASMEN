# Medical Transcription & Patient Record Platform

Weekend proof of concept for an authorised clinician to search a patient, record a consultation, generate a transcript and AI draft note, review it, and save the final note to a shared patient timeline.

## MVP flow

`Login -> Patient search -> Patient dashboard -> New consultation -> Record -> Transcribe -> Generate note -> Review -> Finalise -> Patient timeline`

The raw audio, immutable transcript, AI-generated draft, and clinician-reviewed final note are separate artefacts. AI output must remain visibly labelled as a draft until a clinician finalises it.

## Repository shape

- `app/`: App Router pages and API route handlers
- `components/`: UI grouped by auth, patients, consultations, and shared primitives
- `lib/`: authentication, database clients, validation, and utilities
- `services/`: provider-independent transcription and clinical note generation integrations
- `types/`: shared TypeScript contracts
- `docs/architecture/`: database and API contracts
- `docs/workstreams/`: parallel development ownership and deliverables
- `tests/`: unit and integration tests
- `supabase/`: migrations, local configuration, and templates

## Scope rules

- Use fictional/demo patient data only.
- Keep patient routes protected and API keys server-side.
- Derive ownership from authenticated sessions, never submitted user IDs.
- Keep the first implementation focused on the complete consultation workflow.
- Do not add prescribing, billing, patient portals, complex permissions, or automated diagnosis to the weekend MVP.

## Success criteria

Two authorised demo clinicians can log in, access the same fictional patient, complete the consultation flow, and see the finalised consultation in the patient's timeline after reload.

See `docs/architecture/` and `docs/workstreams/` for the implementation contracts.