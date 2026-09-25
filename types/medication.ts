export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  frequency: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  status: "active" | "stopped";
  notes?: string;
}