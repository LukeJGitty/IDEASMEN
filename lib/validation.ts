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
