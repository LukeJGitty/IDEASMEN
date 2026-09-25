// Pure roster logic: who is on now, shifts per New Zealand day, and coverage gaps.
import { nzDay } from "@/lib/time";
import type { RosterShift, StaffRole } from "@/types/roster";

export const ROLE_LABEL: Record<StaffRole, string> = {
  doctor: "Doctor",
  nurse: "Nurse",
  reception: "Reception",
  other: "Other",
};

export function onShiftNow(shifts: RosterShift[], now = new Date()) {
  const t = now.getTime();
  return shifts
    .filter((s) => Date.parse(s.startsAt) <= t && t < Date.parse(s.endsAt))
    .sort((a, b) => a.role.localeCompare(b.role) || a.staffName.localeCompare(b.staffName));
}

/** Shifts that start on each NZ calendar day, in start order. */
export function shiftsByDay(shifts: RosterShift[], days: string[]) {
  const map = new Map(days.map((d) => [d, [] as RosterShift[]]));
  for (const s of [...shifts].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
    map.get(nzDay(new Date(s.startsAt)))?.push(s);
  return map;
}

// Minimum cover for a clinic day. Days with no shifts at all are treated as closed.
const REQUIRED: StaffRole[] = ["doctor", "nurse"];

export function coverageGaps(dayShifts: RosterShift[]): string[] {
  if (dayShifts.length === 0) return [];
  return REQUIRED.filter((role) => !dayShifts.some((s) => s.role === role)).map(
    (role) => `No ${ROLE_LABEL[role].toLowerCase()} rostered`,
  );
}
