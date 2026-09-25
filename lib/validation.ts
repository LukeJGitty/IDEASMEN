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

const optionalText = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      return String(value).trim();
    },
    z.string().max(max).optional(),
  );

// National Health Index: 3 letters (no I/O) + 4 digits, or + 2 digits and 2 letters.
export const NHI_PATTERN = /^[A-HJ-NP-Z]{3}(\d{4}|\d{2}[A-HJ-NP-Z]{2})$/;
export const normaliseNhi = (value: string) => value.replace(/\s+/g, "").toUpperCase();
export const isNhi = (value: string) => NHI_PATTERN.test(normaliseNhi(value));
export const nhiSchema = z
  .string()
  .transform(normaliseNhi)
  .refine((value) => NHI_PATTERN.test(value), "Enter a valid NHI, e.g. ZZZ0016.");

export const patientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Add the patient’s first name.")
    .max(80, "Keep the first name under 81 characters."),
  lastName: z
    .string()
    .trim()
    .min(1, "Add the patient’s last name.")
    .max(80, "Keep the last name under 81 characters."),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD."),
  email: optionalText(254).refine(
    (value) => value === undefined || z.email().safeParse(value).success,
    "Enter a valid email address.",
  ),
  phone: optionalText(40),
  nhi: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    nhiSchema.optional(),
  ),
});

export const medicationSchema = z.object({
  patientId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, "Add the medication name.")
    .max(120, "Keep the medication name under 121 characters."),
  dose: z
    .string()
    .trim()
    .max(60, "Keep the dose under 61 characters.")
    .default(""),
  frequency: z
    .string()
    .trim()
    .max(60, "Keep the frequency under 61 characters.")
    .default(""),
  route: optionalText(40),
  startDate: optionalText(10).refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Use the format YYYY-MM-DD.",
  ),
  endDate: optionalText(10).refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Use the format YYYY-MM-DD.",
  ),
  status: z.enum(["active", "stopped"]).default("active"),
  notes: optionalText(1000),
});

export const conditionSchema = z.object({
  patientId: idSchema,
  condition: z
    .string()
    .trim()
    .min(1, "Add the medical condition.")
    .max(160, "Keep the condition under 161 characters."),
  diagnosedDate: optionalText(10).refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Use the format YYYY-MM-DD.",
  ),
  status: z.enum(["active", "resolved"]).default("active"),
  notes: optionalText(1000),
});

export const consultationSchema = z.object({ patientId: idSchema });

// Names, or an exact patient ID. Restricted characters keep PostgREST filters safe.
export const patientSearchSchema = z
  .string()
  .trim()
  .max(100, "Keep the search under 101 characters.")
  .refine(
    (value) =>
      /^[\p{L}\p{M}' -]*$/u.test(value) ||
      idSchema.safeParse(value).success ||
      isNhi(value),
    "Search by name, NHI or patient ID.",
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

// WS04: the note a clinician saves or finalises. Only these two statuses can be set here;
// the database stamps who finalised and when.
export const consultationPatchSchema = z
  .object({
    finalNote: clinicalNoteSchema.optional(),
    status: z.enum(["reviewing", "finalised"]).optional(),
  })
  .strict()
  .refine((body) => body.finalNote || body.status, "Send finalNote, status, or both.");
export type ConsultationPatch = z.infer<typeof consultationPatchSchema>;
export const generateNoteRequestSchema = z.object({ consultationId: idSchema }).strict();

// Tasks (Hippo task manager). Due dates arrive as a calendar date or an ISO timestamp.
const optionalUuid = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  idSchema.optional(),
);
export const taskCreateSchema = z.object({
  patientId: idSchema,
  consultationId: optionalUuid,
  title: z
    .string()
    .trim()
    .min(1, "Describe the task.")
    .max(200, "Keep the task under 201 characters."),
  details: z.string().trim().max(1000).optional(),
  dueDate: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.").optional(),
  ),
  dueAt: z.iso.datetime({ offset: true }).optional(),
  assignedTo: optionalUuid,
});
export const taskSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.iso.datetime({ offset: true }).optional(),
});
export const taskUpdateSchema = z
  .object({
    status: z.enum(["open", "done"]).optional(),
    assignedTo: z.union([idSchema, z.null()]).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    dueAt: z.union([z.iso.datetime({ offset: true }), z.null()]).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, "Send at least one field to change.");
export const taskViewSchema = z.enum(["mine", "open", "done"]).catch("mine");

// Roster shifts. Times arrive as a NZ calendar date plus HH:MM start and end.
export const rosterShiftSchema = z
  .object({
    staffName: z.string().trim().min(1, "Add the staff member’s name.").max(80),
    role: z.enum(["doctor", "nurse", "reception", "other"]),
    area: z.string().trim().min(1, "Add the area, e.g. Clinic.").max(60),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a start time."),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick an end time."),
    notes: z.string().trim().max(200).optional(),
  })
  .refine((shift) => shift.end !== shift.start, "The shift needs to end after it starts.");
