import test from "node:test";
import assert from "node:assert/strict";
import {
  dueBucket,
  dueInHours,
  nzDateToDue,
  sortTasks,
  suggestTasks,
} from "../lib/tasks/logic";
import { buildHandoverItem, orderHandover } from "../lib/handover/build";
import { taskCreateSchema, taskUpdateSchema } from "../lib/validation";
import type { Task } from "../types/task";

const now = new Date("2026-09-26T00:00:00Z"); // 12:00 in Auckland
const hoursFromNow = (iso?: string) => (iso ? (Date.parse(iso) - now.getTime()) / 3_600_000 : undefined);

test("follow-up tasks come from actionable plan and follow-up sentences only", () => {
  const tasks = suggestTasks(
    {
      plan: "Take paracetamol for comfort. Repeat bloods in 2 days. Refer to physio. Rest and fluids.",
      followUp: "Come back in one week if it's not improving. Repeat bloods in 2 days.",
    },
    now,
  );
  assert.deepEqual(
    tasks.map((t) => t.title),
    ["Repeat bloods in 2 days.", "Refer to physio.", "Come back in one week if it's not improving."],
  );
  assert.equal(hoursFromNow(tasks[0].dueAt), 48);
  assert.equal(tasks[1].dueAt, undefined);
  assert.equal(hoursFromNow(tasks[2].dueAt), 24 * 7);
});

test("due phrases are understood", () => {
  assert.equal(dueInHours("Chase results tomorrow"), 24);
  assert.equal(dueInHours("Review in three weeks"), 24 * 21);
  assert.equal(dueInHours("Book an appointment next week"), 24 * 7);
  assert.equal(dueInHours("Phone with results today"), 4);
  assert.equal(dueInHours("Refer to physio"), undefined);
});

test("calendar due dates land at 5pm New Zealand time across daylight saving", () => {
  assert.equal(nzDateToDue("2026-09-26"), "2026-09-26T05:00:00.000Z"); // NZST, UTC+12
  assert.equal(nzDateToDue("2026-10-01"), "2026-10-01T04:00:00.000Z"); // NZDT, UTC+13
});

const task = (over: Partial<Task>): Task => ({
  id: over.id ?? "t",
  patientId: "p",
  title: "Task",
  status: "open",
  source: "manual",
  createdAt: "2026-09-25T00:00:00Z",
  ...over,
});

test("tasks group and sort with overdue first", () => {
  const overdue = task({ id: "a", dueAt: "2026-09-25T20:00:00Z" });
  const today = task({ id: "b", dueAt: "2026-09-26T04:00:00Z" });
  const later = task({ id: "c", dueAt: "2026-09-30T04:00:00Z" });
  const none = task({ id: "d" });
  const done = task({ id: "e", status: "done", dueAt: "2026-09-20T00:00:00Z" });
  assert.deepEqual(
    [overdue, today, later, none, done].map((t) => dueBucket(t, now)),
    ["overdue", "today", "upcoming", "someday", "done"],
  );
  assert.deepEqual(
    sortTasks([none, done, later, today, overdue], now).map((t) => t.id),
    ["a", "b", "c", "d", "e"],
  );
});

test("handover flags unreviewed drafts and overdue tasks and lists what to do", () => {
  const item = buildHandoverItem(
    {
      patient: { id: "p1", firstName: "Aroha", lastName: "Demo-Ngata", dateOfBirth: "1984-03-12" },
      conditions: [{ id: "c", patientId: "p1", condition: "Asthma", status: "active" }],
      medications: [
        { id: "m", patientId: "p1", name: "Salbutamol inhaler", dose: "100 mcg", frequency: "PRN", status: "active" },
      ],
      consultations: [
        {
          id: "k1",
          patientId: "p1",
          doctorId: "d",
          date: "2026-09-25T22:00:00Z",
          status: "draft_generated",
          transcript: "…",
          generatedDraft: {
            reasonForVisit: "Dry cough for a week",
            history: "",
            relevantMedicalHistory: "",
            currentMedications: [],
            observations: "Chest clear.",
            assessment: "Post-viral cough.",
            plan: "",
            followUp: "",
          },
        },
      ],
      tasks: [task({ id: "t1", title: "Chase CXR report", dueAt: "2026-09-25T20:00:00Z" })],
    },
    now,
  );
  assert.equal(item.age, 42);
  assert.deepEqual(item.flags, ["1 note not finalised", "1 overdue task"]);
  assert.match(item.situation, /dry cough for a week/);
  assert.match(item.assessment, /^AI draft \(not reviewed\): Post-viral cough/);
  assert.match(item.background, /Asthma.*Salbutamol inhaler 100 mcg/);
  assert.match(item.recommendations[0], /Review and finalise/);
  assert.match(item.recommendations[1], /^Chase CXR report: due .*overdue\)$/);

  const quiet = { ...item, patientId: "p2", name: "Aaron Quiet", flags: [] };
  assert.deepEqual(orderHandover([quiet, item]).map((i) => i.patientId), ["p1", "p2"]);
});

test("task inputs are validated and completion can't be forged", () => {
  const ok = taskCreateSchema.safeParse({
    patientId: "00000000-0000-4000-8000-000000000001",
    title: "  Chase bloods ",
    dueDate: "",
    assignedTo: "",
  });
  assert.equal(ok.success, true);
  assert.equal(ok.success && ok.data.title, "Chase bloods");
  assert.equal(ok.success && ok.data.assignedTo, undefined);
  assert.equal(taskCreateSchema.safeParse({ patientId: "x", title: "t" }).success, false);
  assert.equal(taskUpdateSchema.safeParse({ status: "done" }).success, true);
  assert.equal(taskUpdateSchema.safeParse({ completedBy: "someone" }).success, false);
  assert.equal(taskUpdateSchema.safeParse({}).success, false);
});
