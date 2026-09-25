# WS05: Integration, QA, and Deployment

Own integration of the workstreams, demo data, end-to-end workflow checks, deployment, and final UI/error-state cleanup.

**Priority check:** login, search, open patient, record, transcribe, generate, edit, finalise, reload, and verify the timeline with a second authorised clinician.

## Tasks

1. **Keep `main` green.** Merge workstream branches in dependency order (WS01, then WS02, then WS03 and WS04). Rebase conflicts in `lib/validation.ts` and `lib/database.types.ts` go to WS01 for review.
2. **Grow the end-to-end check** in `scripts/test-integration.ts`. Use the mock transcription and note providers so CI needs no paid keys. Add each step as it lands:
   - API returns 401, 403, and 200 for anonymous, non-clinician, and clinician (WS01, done).
   - Create a patient and open the dashboard (WS02).
   - Upload fixture audio and get a transcript (WS03). Add a short fictional `.webm` under `tests/fixtures/`.
   - Generate, edit, and finalise the note (WS04).
   - Clinician B loads the timeline and sees the finalised note.
3. **Demo readiness.**
   - Run `pnpm db:reset && pnpm db:seed-users` locally.
   - Write a 5-minute demo script covering both clinicians in two browser profiles.
   - Pass over every page for empty, loading, and error states.
4. **Deployment.**
   - Use a dedicated Supabase project (owner approval required).
   - Run `supabase db push` and flag the demo clinicians (see WS01).
   - Deploy to Vercel with the provider keys as server-only env vars.
   - Rerun the priority check on the deployed URL.
5. **Retire the starter.** Remove the ideas example and rename the app metadata and package, after WS02's dashboard replaces the landing flow.

## Acceptance

The priority check passes on the deployed URL with two accounts, and CI is green.
