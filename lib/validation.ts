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
