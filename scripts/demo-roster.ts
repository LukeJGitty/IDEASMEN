/**
 * The demo roster: ward nurses around the clock (early, late and night), clinic doctors
 * and nurses on weekdays, a short Saturday clinic, a doctor on call every night, one
 * weekday with the clinic nurses away (so the coverage warning shows), and an evening
 * clinic from 4pm for every other team member who is on the roster.
 */
import type { Database } from "../lib/database.types";
import { nzDays, nzLocalToIso } from "../lib/time";
import type { SeedTarget } from "./seed-target";

type Shift = Database["public"]["Tables"]["roster_shifts"]["Insert"];

export function buildDemoRoster(clinicians: SeedTarget["clinicians"], now = Date.now()): Shift[] {
  const shifts: Shift[] = [];
  const add = (day: string, staff: string, role: string, area: string, start: string, end: string) => {
    const startsAt = nzLocalToIso(day, start);
    let endsAt = nzLocalToIso(day, end);
    if (endsAt <= startsAt) endsAt = new Date(Date.parse(endsAt) + 86_400_000).toISOString();
    shifts.push({ staff_name: staff, role, area, starts_at: startsAt, ends_at: endsAt, notes: "demo roster" });
  };
  const wardNurses = ["Aroha Rangi", "Sofia Reyes", "Liam O'Connor", "Priya Shah", "Tavita Leota", "Emma Brown"];
  const days = nzDays(8, new Date(now - 86_400_000)); // yesterday + the next 7 days
  const { a, b } = clinicians;
  const drA = a.roster ? a.fullName : "Dr Demo A";
  const drB = b.email !== a.email && b.roster ? b.fullName : "Dr Demo Locum";
  const evening = clinicians.all.filter((c) => c.roster && c.email !== a.email && c.email !== b.email);

  days.forEach((day, i) => {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = Sunday
    const nurse = (k: number) => wardNurses[(i * 3 + k) % wardNurses.length];
    add(day, nurse(0), "nurse", "Ward, early", "07:00", "15:30");
    add(day, nurse(1), "nurse", "Ward, late", "15:00", "23:30");
    add(day, nurse(2), "nurse", "Ward, night", "23:00", "07:30");
    add(day, drB, "doctor", "After-hours on call", "20:00", "08:00");
    for (const c of evening) add(day, c.fullName, "doctor", "Evening clinic", "16:00", "00:00");
    if (weekday === 0) {
      add(day, drA, "doctor", "Weekend ward round", "08:00", "20:00");
      return;
    }
    if (weekday === 6) {
      add(day, drA, "doctor", "Weekend ward round", "08:00", "20:00");
      add(day, drB, "doctor", "Clinic", "09:00", "13:00");
      add(day, "Hana Kim", "nurse", "Treatment room", "09:00", "13:00");
      add(day, "Mele Tonga", "reception", "Front desk", "08:45", "13:15");
      return;
    }
    add(day, drA, "doctor", "Clinic", "08:00", "17:00");
    add(day, drB, "doctor", "Clinic", "12:00", "20:00");
    add(day, "Mele Tonga", "reception", "Front desk", "07:45", "16:15");
    if (i === 4) return; // clinic nurses away
    add(day, "Hana Kim", "nurse", "Treatment room", "08:00", "16:30");
    add(day, "Rawiri Te Awa", "nurse", "Treatment room", "12:00", "20:30");
  });
  return shifts;
}
