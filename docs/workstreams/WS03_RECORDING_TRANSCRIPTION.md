# WS03: Recording and Transcription

Own browser microphone capture, playback, upload, transcription states, and transcription error handling.

**Deliverable:** a clinician can record a short consultation and receive a persisted raw transcript.

Provider calls belong in `services/transcription.ts`, never in UI components.

## Builds on (from WS01)

- Private storage bucket `consultation-audio`. Clinicians can upload and read; nobody can overwrite or delete.
- `consultations.audio_path` and `consultations.transcript`. The transcript can be written once only; the database rejects a second write.
- `getConsultation` from `lib/data/queries.ts`, and `authenticateClinician` plus `apiError` for the route handler.

## Progress

| Task | Where | Status |
| --- | --- | --- |
| 1. Consultation workspace page | `app/consultations/[id]/page.tsx` | ✅ (note step is a placeholder for WS04) |
| 2. Recorder with playback, discard, timer, permission errors | `components/consultation/recorder.tsx` | ✅ code; needs a manual browser check |
| 3. `POST /api/transcribe` with write-once audio and transcript, 502 + retry from stored audio | `app/api/transcribe/route.ts` | ✅ |
| 4. Provider service with `mock` provider | `services/transcription.ts` | ✅ `mock` (default) and `openai` (`TRANSCRIPTION_PROVIDER=openai` + `OPENAI_API_KEY`; enable once the owner approves spend) |
| 5. Read-only "Raw transcript" view | `components/consultation/transcript.tsx` | ✅ |
| Audio/input validation; unit and HTTP integration checks | `lib/validation.ts`, `tests/clinical.test.ts`, `scripts/test-integration.ts` | ✅ |

Notes:
- A retry (`audio_path` set, `transcript` null) sends only `consultationId`; the route transcribes the stored recording, because `audio_path` is write-once.
- `next.config.ts` raises `experimental.proxyClientMaxBodySize` to 26 MB, because the proxy buffers `/api` bodies (10 MB by default).

## Tasks

1. **Consultation workspace page** (`app/consultations/[id]/page.tsx`).
   - Loads the consultation with `requireClinician()` and `getConsultation`.
   - Renders the recorder, transcript, or note step based on `status`. WS04 fills the note step.
2. **Recorder** (`components/consultation/recorder.tsx`, a Client Component).
   - `MediaRecorder` with `audio/webm` (fall back to `audio/mp4` on Safari).
   - Start, stop, and discard controls, an elapsed timer, and `<audio>` playback before upload.
   - Handle microphone permission denial with a clear message.
3. **Upload and transcribe** (`app/api/transcribe/route.ts`).
   - Accepts multipart `audio` plus `consultationId`, validated with Zod. Limit to 25 MB and the audio MIME types the bucket allows.
   - Uploads to `consultation-audio/<consultationId>/<timestamp>.webm` and sets `audio_path` and `status = 'transcribing'`.
   - Calls `transcribe()`, then writes `transcript`. The status stays `transcribing` until WS04 writes the draft.
   - On provider failure, keep the audio, return `502` with a retry message, and leave `transcript` null so a retry can write it.
4. **Provider service** (`services/transcription.ts`).
   - `transcribe(audio: Blob): Promise<{ text: string }>` behind a `TRANSCRIPTION_PROVIDER` env var.
   - Ship a `mock` provider first that returns a fixed fictional transcript, so the flow works with no paid account.
   - Add a real provider only after the owner approves the account and cost. Candidates: Whisper-compatible API, Deepgram.
   - Keys are server-only env vars, added to `.env.example` as placeholders.
5. **Transcript view** (`components/consultation/transcript.tsx`). Read-only and clearly labelled "Raw transcript".

## Acceptance

- Record 10 seconds, play it back, upload it, and see a transcript that persists across reload.
- Denying the microphone shows guidance, not a crash.
- A second transcription attempt on the same consultation is rejected.

## Out of scope

Live streaming transcription and speaker diarisation.
