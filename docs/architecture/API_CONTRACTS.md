# API Contracts

All handlers must require an authenticated user, validate input with Zod, and return JSON errors with an appropriate HTTP status.

## Patients

```text
GET   /api/patients?q=<name-or-id>
GET   /api/patients/:id
POST  /api/patients
PATCH /api/patients/:id
```

## Consultations

```text
GET   /api/patients/:id/consultations
POST  /api/consultations
GET   /api/consultations/:id
PATCH /api/consultations/:id
```

## Processing

```text
POST /api/transcribe
POST /api/generate-note
```

`/api/transcribe` accepts an audio file and consultation ID. `/api/generate-note` accepts a consultation ID and raw transcript. Both integrations are server-side and must persist their result separately from the final note.