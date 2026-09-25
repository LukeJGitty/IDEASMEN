export type ConsultationStatus =
  | "recording"
  | "uploading"
  | "transcribing"
  | "draft_generated"
  | "reviewing"
  | "finalised";

export interface ClinicalNote {
  reasonForVisit: string;
  history: string;
  relevantMedicalHistory: string;
  currentMedications: string[];
  observations: string;
  assessment: string;
  plan: string;
  followUp: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  status: ConsultationStatus;
  transcript?: string;
  generatedDraft?: ClinicalNote;
  finalNote?: ClinicalNote;
  finalisedAt?: string;
}