export type TaskStatus = "open" | "done";
export type TaskSource = "manual" | "note";

export interface Task {
  id: string;
  patientId: string;
  consultationId?: string;
  title: string;
  details?: string;
  dueAt?: string;
  status: TaskStatus;
  source: TaskSource;
  assignedTo?: string;
  createdBy?: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
}
