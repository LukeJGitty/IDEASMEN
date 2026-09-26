import test from "node:test";
import assert from "node:assert/strict";
import { formatHours, median, noteTurnaround, teamWorkload, timeSaved } from "../lib/dashboard/insights";

const days = ["2026-09-25", "2026-09-26"]; // NZ days
const now = new Date("2026-09-25T22:00:00Z"); // 10am 26 Sep NZ

test("median handles odd, even and empty lists", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), undefined);
});

test("note turnaround is the median time to finalise, per consultation day", () => {
  const result = noteTurnaround(
    [
      { status: "finalised", consultedAt: "2026-09-24T20:00:00Z", finalisedAt: "2026-09-24T21:00:00Z" }, // 25 Sep, 1 h
      { status: "finalised", consultedAt: "2026-09-24T22:00:00Z", finalisedAt: "2026-09-25T01:00:00Z" }, // 25 Sep, 3 h
      { status: "finalised", consultedAt: "2026-09-25T20:00:00Z", finalisedAt: "2026-09-25T20:30:00Z" }, // 26 Sep, 0.5 h
      { status: "reviewing", consultedAt: "2026-09-25T21:00:00Z" },
      { status: "finalised", consultedAt: "2026-09-01T20:00:00Z", finalisedAt: "2026-09-01T21:00:00Z" }, // outside
    ],
    days,
  );
  assert.deepEqual(result.perDay, [
    { day: "2026-09-25", medianHours: 2, count: 2 },
    { day: "2026-09-26", medianHours: 0.5, count: 1 },
  ]);
  assert.equal(result.medianHours, 1);
  assert.equal(result.finalised, 3);
  assert.equal(result.waiting, 1);
});

test("workload counts open tasks per person, overdue first-class, busiest first", () => {
  const rows = teamWorkload(
    [
      { status: "open", assignedTo: "b", dueAt: "2026-09-20T00:00:00Z" }, // overdue
      { status: "open", assignedTo: "b", dueAt: "2026-09-30T00:00:00Z" },
      { status: "open", assignedTo: "b" },
      { status: "open", assignedTo: "a", dueAt: "2026-09-30T00:00:00Z" },
      { status: "open" },
      { status: "done", assignedTo: "a" },
    ],
    [
      { id: "a", name: "Dr A" },
      { id: "b", name: "Dr B" },
    ],
    now,
  );
  assert.deepEqual(rows, [
    { id: "b", name: "Dr B", overdue: 1, onTrack: 2, total: 3 },
    { id: "a", name: "Dr A", overdue: 0, onTrack: 1, total: 1 },
    { id: null, name: "Unassigned", overdue: 0, onTrack: 1, total: 1 },
  ]);
});

test("time saved counts AI-drafted notes at the stated minutes each", () => {
  const saved = timeSaved(
    [
      { status: "finalised", consultedAt: "2026-09-24T20:00:00Z" },
      { status: "draft_generated", consultedAt: "2026-09-25T20:00:00Z" },
      { status: "transcribing", consultedAt: "2026-09-25T21:00:00Z" }, // no AI draft yet
    ],
    days,
    6,
  );
  assert.equal(saved.notes, 2);
  assert.equal(saved.hours, 0.2);
  assert.deepEqual(saved.perDay.map((d) => d.notes), [1, 1]);
});

test("durations read naturally", () => {
  assert.equal(formatHours(0.25), "15 min");
  assert.equal(formatHours(2.44), "2.4 h");
  assert.equal(formatHours(72), "3 days");
  assert.equal(formatHours(undefined), "–");
});
