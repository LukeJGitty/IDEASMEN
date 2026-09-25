export type StaffRole = "doctor" | "nurse" | "reception" | "other";

export interface RosterShift {
  id: string;
  staffName: string;
  role: StaffRole;
  area: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
}
