import type { Tables } from "@/lib/database.types";
import type {
  ClinicalNote,
  Consultation,
  ConsultationStatus,
} from "@/types/consultation";
import type { Medication } from "@/types/medication";
import type { MedicalCondition, Patient } from "@/types/patient";
import { clinicalNoteSchema } from "@/lib/validation";

// Database rows are snake_case and nullable; domain types are camelCase and optional.
const opt = <T>(value: T | null) => value ?? undefined;

export function toPatient(row: Tables<"patients">): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    email: opt(row.email),
    phone: opt(row.phone),
  };
}

export function toMedication(row: Tables<"medications">): Medication {
  return {
    id: row.id,
    patientId: row.patient_id,
    name: row.name,
    dose: row.dose,
    frequency: row.frequency,
    route: opt(row.route),
    startDate: opt(row.start_date),
    endDate: opt(row.end_date),
    status: row.status === "stopped" ? "stopped" : "active",
    notes: opt(row.notes),
  };
}

export function toCondition(
  row: Tables<"medical_conditions">,
): MedicalCondition {
  return {
    id: row.id,
    patientId: row.patient_id,
    condition: row.condition,
    diagnosedDate: opt(row.diagnosed_date),
    status: row.status === "resolved" ? "resolved" : "active",
    notes: opt(row.notes),
  };
}

// A stored note that no longer matches the schema is surfaced as missing, not trusted.
export function toClinicalNote(value: unknown): ClinicalNote | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = clinicalNoteSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function toConsultation(row: Tables<"consultations">): Consultation {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    date: row.consulted_at,
    status: row.status as ConsultationStatus,
    audioPath: opt(row.audio_path),
    transcript: opt(row.transcript),
    generatedDraft: toClinicalNote(row.generated_draft),
    finalNote: toClinicalNote(row.final_note),
    finalisedBy: opt(row.finalised_by),
    finalisedAt: opt(row.finalised_at),
  };
}
