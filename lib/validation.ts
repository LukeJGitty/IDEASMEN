import { z } from "zod";
export const emailSchema = z.email().trim().toLowerCase().max(254);
export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, "Enter the code from your email.");
export const ideaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your idea a title.")
    .max(120, "Keep the title under 121 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2,001 characters."),
});
export const idSchema = z.uuid();
export type FormState = { error?: string; success?: string; email?: string };

// Names, or an exact patient ID. Restricted characters keep PostgREST filters safe.
export const patientSearchSchema = z
  .string()
  .trim()
  .max(100, "Keep the search under 101 characters.")
  .refine(
    (value) =>
      /^[\p{L}\p{M}' -]*$/u.test(value) || idSchema.safeParse(value).success,
    "Search by name or patient ID.",
  );

const noteText = (max: number) => z.string().trim().max(max).default("");
// Shared by the AI draft and the clinician's final note (WS04).
export const clinicalNoteSchema = z.object({
  reasonForVisit: noteText(2000),
  history: noteText(8000),
  relevantMedicalHistory: noteText(4000),
  currentMedications: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  observations: noteText(4000),
  assessment: noteText(4000),
  plan: noteText(4000),
  followUp: noteText(2000),
});

// Consultation audio (WS03). Mirrors the consultation-audio bucket's limits.
export const maxAudioBytes = 25 * 1024 * 1024;
const audioExtensions: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};
/** MediaRecorder reports types like `audio/webm;codecs=opus`; storage wants the base type. */
export const baseMimeType = (type: string) =>
  type.split(";")[0].trim().toLowerCase();
export const audioExtension = (type: string) =>
  audioExtensions[baseMimeType(type)];

export const audioSchema = z
  .instanceof(Blob, { message: "Attach an audio recording." })
  .refine((audio) => audio.size > 0, "The recording is empty.")
  .refine(
    (audio) => audio.size <= maxAudioBytes,
    "Keep recordings under 25 MB.",
  )
  .refine(
    (audio) => audioExtension(audio.type) !== undefined,
    "Upload WebM, Ogg, MP4, MP3 or WAV audio.",
  );
// `audio` may be omitted when retrying a consultation whose audio is already stored.
export const transcribeSchema = z.object({
  consultationId: idSchema,
  audio: audioSchema.optional(),
});
