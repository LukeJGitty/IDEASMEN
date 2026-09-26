export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  /** National Health Index number, upper-case. */
  nhi?: string;
}

export interface MedicalCondition {
  id: string;
  patientId: string;
  condition: string;
  diagnosedDate?: string;
  status: "active" | "resolved";
  notes?: string;
}