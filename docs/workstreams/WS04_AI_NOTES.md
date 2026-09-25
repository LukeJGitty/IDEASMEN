# WS04: AI Clinical Notes

Own transcript-to-note generation, editable structured note fields, draft labelling, clinician review, and finalisation.

**Deliverable:** a transcript becomes an editable AI draft and only a clinician action can turn it into a final note.

Provider calls belong in `services/noteGeneration.ts`, never in UI components.

## Builds on (from WS01)

- `clinicalNoteSchema` and the `ClinicalNote` type. The draft and the final note use the same shape.
- The database guard enforces three rules:
  - `generated_draft` can be written once.
  - Setting `status = 'finalised'` requires `final_note`, and the database stamps `finalised_by` and `finalised_at` itself.
  - After finalisation the row is read-only.

## Tasks

1. **Note service** (`services/noteGeneration.ts`).
   - `generateNote(transcript: string, context: { medications, conditions }): Promise<ClinicalNote>`.
   - Default provider is Claude via the Anthropic SDK: server-only `ANTHROPIC_API_KEY`, with the `mock` provider as default until the owner approves spend.
   - Use structured output against `clinicalNoteSchema` and re-validate the response before returning it.
   - The system prompt says to extract only what the transcript supports, leave fields empty rather than guess, and give no diagnosis beyond what the clinician stated.
2. **Route** (`app/api/generate-note/route.ts`).
   - Validates `consultationId`, then loads the stored transcript from the database. Never trust a transcript sent by the client.
   - Writes `generated_draft` and sets `status = 'draft_generated'`.
   - Returns `409` if a draft already exists.
3. **Review editor** (`components/consultation/note-editor.tsx`).
   - One field per `ClinicalNote` key, pre-filled from the draft, with a persistent "AI draft — review before finalising" banner.
   - Saving edits writes `final_note` and sets `status = 'reviewing'`.
4. **Finalise** (Server Action `finaliseConsultation`).
   - Validates the note, then writes `final_note` and `status = 'finalised'` in a single update.
   - Needs an explicit confirmation step in the UI.
   - Afterwards, the page shows the final note read-only, with the finaliser and timestamp.
5. **PATCH `/api/consultations/:id`**: the same validation as the Server Actions, for API parity.

## Acceptance

- The transcript produces a draft, the draft is visibly labelled as AI, and editing and finalising stamps who and when.
- Reload shows the final note, and the original draft is still stored unchanged.
- Editing after finalisation fails at the database even if the UI is bypassed.

## Out of scope

Automated diagnosis, coding (ICD/SNOMED), prescribing, and regenerating a draft.
