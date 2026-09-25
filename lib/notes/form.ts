import type { ClinicalNote } from "@/types/consultation";

// One form field per ClinicalNote key, in reading order. Shared by the editor and the actions.
export const NOTE_FIELDS: {
  key: keyof ClinicalNote;
  label: string;
  rows: number;
  max: number;
}[] = [
  { key: "reasonForVisit", label: "Reason for visit", rows: 2, max: 2000 },
  { key: "history", label: "History", rows: 5, max: 8000 },
  { key: "relevantMedicalHistory", label: "Relevant medical history", rows: 3, max: 4000 },
  { key: "currentMedications", label: "Current medications (one per line)", rows: 3, max: 10000 },
  { key: "observations", label: "Observations", rows: 3, max: 4000 },
  { key: "assessment", label: "Assessment", rows: 3, max: 4000 },
  { key: "plan", label: "Plan", rows: 4, max: 4000 },
  { key: "followUp", label: "Follow-up", rows: 2, max: 2000 },
];

/** Raw form values -> an unvalidated note object; clinicalNoteSchema decides if it is acceptable. */
export function noteFromForm(form: FormData) {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    reasonForVisit: text("reasonForVisit"),
    history: text("history"),
    relevantMedicalHistory: text("relevantMedicalHistory"),
    currentMedications: text("currentMedications")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    observations: text("observations"),
    assessment: text("assessment"),
    plan: text("plan"),
    followUp: text("followUp"),
  };
}

export const fieldValue = (note: ClinicalNote, key: keyof ClinicalNote) => {
  const value = note[key];
  return Array.isArray(value) ? value.join("\n") : value;
};
