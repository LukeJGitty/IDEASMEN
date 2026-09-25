# API Contracts

All handlers must require an authenticated clinician (`authenticateClinician()` in `lib/auth.ts`), validate input with Zod, and return JSON through `apiData`/`apiError` in `lib/api.ts`.

## Envelope

- Success: `{ "data": <payload> }`
- Failure: `{ "error": "<human-readable message>" }`

| Status | Meaning |
| --- | --- |
| 400 | Invalid input |
| 401 | Not signed in |
| 403 | Signed in, but the profile is not an authorised clinician |
| 404 | Not found (also returned for a malformed ID) |
| 409 | Conflicts with an immutable artefact, such as a transcript or draft that already exists |
| 500 | Database failure (details are not exposed) |

Payloads use the camelCase domain types in `types/`, never raw database rows.

## Patients

```text
GET   /api/patients?q=<name-or-id>        -> Patient[] (max 25; all patients when q is empty)   [WS01 ✅]
GET   /api/patients/:id                   -> { patient, medications, conditions }             [WS01 ✅]
POST  /api/patients                       -> Patient                                          [WS02]
PATCH /api/patients/:id                   -> Patient                                          [WS02]
```

`q` accepts letters, spaces, hyphens, and apostrophes, or an exact patient UUID. Each word must match a first or last name.

## Consultations

```text
GET   /api/patients/:id/consultations     -> Consultation[] (newest first)                    [WS01 ✅]
POST  /api/consultations                  -> Consultation  { patientId }                      [WS02]
GET   /api/consultations/:id              -> Consultation                                     [WS01 ✅]
PATCH /api/consultations/:id              -> Consultation  { finalNote?, status? }            [WS04 ✅]
```

## Processing

```text
POST /api/transcribe       multipart { audio, consultationId } -> Consultation   [WS03]
POST /api/generate-note    { consultationId }                  -> Consultation   [WS04 ✅]
```

`/api/transcribe` accepts an audio file and consultation ID. `/api/generate-note` accepts a consultation ID and reads the stored raw transcript itself. The client never supplies the transcript. Both integrations are server-side and must persist their result separately from the final note.

### WS04 details

- `POST /api/generate-note` returns `409` if a draft already exists, if there is no transcript yet, or if the consultation is finalised. It returns `502` if the note provider fails; nothing is written in that case.
- `PATCH /api/consultations/:id` accepts only `status: "reviewing" | "finalised"`. Saving a review needs `finalNote`. Finalising uses the sent `finalNote`, or the saved review if none is sent. Unknown fields such as `finalisedBy` are rejected with `400`.

## Tasks

```text
GET   /api/tasks?view=mine|open|done   -> (Task & { patientName })[] (overdue first)
POST  /api/tasks                        -> Task  { patientId, title, consultationId?, dueDate? | dueAt?, assignedTo? }
PATCH /api/tasks/:id                    -> Task  { status?, assignedTo?, title?, dueAt? }
```

`dueDate` is a calendar date and becomes 5pm New Zealand time. The database fills `created_by`, and stamps `completed_by`/`completed_at` when a task is marked done. Tasks are never deleted; they are completed or reopened.
