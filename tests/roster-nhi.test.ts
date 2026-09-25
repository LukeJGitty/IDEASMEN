import test from "node:test";
import assert from "node:assert/strict";
import { coverageGaps, onShiftNow, shiftsByDay } from "../lib/roster/logic";
import { nzDays, nzLocalToIso } from "../lib/time";
import { isNhi, nhiSchema, patientSchema, patientSearchSchema, rosterShiftSchema } from "../lib/validation";
import type { RosterShift } from "../types/roster";

test("NHIs are validated in both formats and normalised to upper case", () => {
  for (const good of ["ZZZ0016", "zzz0016", "ZAC12AB", " zzz 0024 "]) assert.equal(isNhi(good), true, good);
  for (const bad of ["ZZ0016", "ZIO1234", "ZZZ001", "ZZZ00166", "123ABCD", "ZZZ12A4"]) assert.equal(isNhi(bad), false, bad);
  assert.equal(nhiSchema.parse(" zzz0016 "), "ZZZ0016");
});

test("patient search accepts an NHI, and patients can carry one", () => {
  assert.equal(patientSearchSchema.safeParse("ZZZ0016").success, true);
  assert.equal(patientSearchSchema.safeParse("Demo-12345").success, false);
  const patient = patientSchema.parse({ firstName: "A", lastName: "B", dateOfBirth: "1990-01-01", nhi: "zzz0016" });
  assert.equal(patient.nhi, "ZZZ0016");
  assert.equal(patientSchema.parse({ firstName: "A", lastName: "B", dateOfBirth: "1990-01-01", nhi: "" }).nhi, undefined);
  assert.equal(patientSchema.safeParse({ firstName: "A", lastName: "B", dateOfBirth: "1990-01-01", nhi: "nope" }).success, false);
});

const shift = (o: Partial<RosterShift>): RosterShift => ({
  id: Math.random().toString(),
  staffName: "Someone",
  role: "nurse",
  area: "Clinic",
  startsAt: "2026-09-28T19:00:00Z",
  endsAt: "2026-09-29T03:00:00Z",
  ...o,
});

test("roster shows who is on now, groups by NZ day and flags missing cover", () => {
  const now = new Date("2026-09-28T22:00:00Z"); // Tue 29 Sep, 11am in Auckland (NZDT)
  const nurse = shift({ staffName: "Hana" });
  const doctor = shift({ staffName: "Dr A", role: "doctor", startsAt: "2026-09-29T00:00:00Z", endsAt: "2026-09-29T05:00:00Z" });
  assert.deepEqual(onShiftNow([nurse, doctor], now).map((s) => s.staffName), ["Hana"]);
  const byDay = shiftsByDay([nurse, doctor], ["2026-09-29", "2026-09-30"]);
  assert.equal(byDay.get("2026-09-29")?.length, 2);
  assert.deepEqual(coverageGaps(byDay.get("2026-09-29")!), []);
  assert.deepEqual(coverageGaps([nurse]), ["No doctor rostered"]);
  assert.deepEqual(coverageGaps([]), [], "a day with nobody rostered is treated as closed");
});

test("NZ times convert correctly and the week starts today", () => {
  assert.equal(nzLocalToIso("2026-09-29", "08:30"), "2026-09-28T19:30:00.000Z");
  assert.deepEqual(nzDays(3, new Date("2026-09-28T22:00:00Z")), ["2026-09-29", "2026-09-30", "2026-10-01"]);
  assert.equal(rosterShiftSchema.safeParse({ staffName: "Hana", role: "nurse", area: "Clinic", date: "2026-09-29", start: "08:00", end: "08:00" }).success, false);
  assert.equal(rosterShiftSchema.safeParse({ staffName: "Hana", role: "nurse", area: "Clinic", date: "2026-09-29", start: "20:00", end: "08:00" }).success, true);
});
