import test from "node:test";
import assert from "node:assert/strict";
import {
  consultationsPerDay,
  dashboardCounts,
  greeting,
  pastNzDays,
  reviewQueue,
  type DashboardConsultation,
} from "../lib/dashboard/summary";
import { devInboxEnabled, devInboxUrl, extractCode, latestDevCode } from "../lib/dev-inbox";

// 10:00 on Saturday 26 September 2026 in New Zealand (NZST+1 = NZDT from 27 Sep).
const now = new Date("2026-09-25T22:00:00Z");
const me = "00000000-0000-4000-8000-00000000000a";
const colleague = "00000000-0000-4000-8000-00000000000b";

const consult = (
  id: string,
  consultedAt: string,
  status: DashboardConsultation["status"],
  doctorId = me,
  patientId = `p-${id}`,
): DashboardConsultation => ({ id, patientId, patientName: `Patient ${id}`, doctorId, status, consultedAt });

test("the week runs over the last 7 New Zealand days, oldest first", () => {
  const days = pastNzDays(7, now);
  assert.equal(days.length, 7);
  assert.equal(days[6], "2026-09-26");
  assert.equal(days[0], "2026-09-20");
});

test("consultations are counted on their New Zealand day", () => {
  const days = pastNzDays(7, now);
  const week = consultationsPerDay(
    [
      { consultedAt: "2026-09-25T20:00:00Z" }, // 08:00 Sat NZ
      { consultedAt: "2026-09-25T11:30:00Z" }, // 23:30 Fri NZ
      { consultedAt: "2026-09-01T00:00:00Z" }, // outside the week
    ],
    days,
  );
  assert.deepEqual(week.slice(-2), [
    { day: "2026-09-25", count: 1 },
    { day: "2026-09-26", count: 1 },
  ]);
  assert.equal(week.reduce((s, d) => s + d.count, 0), 2);
});

test("dashboard counts split mine from the team's", () => {
  const counts = dashboardCounts({
    userId: me,
    now,
    openTasks: [
      { status: "open", assignedTo: me, dueAt: "2026-09-25T20:00:00Z" }, // overdue
      { status: "open", assignedTo: me, dueAt: "2026-09-26T03:00:00Z" }, // later today
      { status: "open", assignedTo: me },
      { status: "open", assignedTo: colleague, dueAt: "2026-09-24T00:00:00Z" }, // overdue
      { status: "open", dueAt: "2026-09-30T00:00:00Z" }, // unassigned
    ],
    doneTasks: [{ completedAt: "2026-09-25T21:00:00Z" }, { completedAt: "2026-09-20T21:00:00Z" }],
    consultations: [
      consult("a", "2026-09-25T20:00:00Z", "draft_generated", me, "p1"),
      consult("b", "2026-09-25T21:00:00Z", "finalised", colleague, "p1"),
      consult("c", "2026-09-22T21:00:00Z", "reviewing", colleague, "p2"),
    ],
  });
  assert.deepEqual(counts, {
    myOverdue: 1,
    myDueToday: 1,
    myOpen: 3,
    teamOverdue: 2,
    unassigned: 1,
    toReview: 2,
    myToReview: 1,
    seenToday: 1, // p1 seen twice today counts once
    doneToday: 1,
  });
});

test("review queue puts my notes first, then the longest waiting", () => {
  const queue = reviewQueue(
    [
      consult("new-theirs", "2026-09-25T20:00:00Z", "reviewing", colleague),
      consult("old-theirs", "2026-09-20T20:00:00Z", "draft_generated", colleague),
      consult("mine", "2026-09-25T21:00:00Z", "transcribing", me),
      consult("done", "2026-09-19T21:00:00Z", "finalised", me),
    ],
    me,
  );
  assert.deepEqual(
    queue.map((c) => c.id),
    ["mine", "old-theirs", "new-theirs"],
  );
});

test("greeting follows New Zealand time", () => {
  assert.equal(greeting(now), "Good morning");
  assert.equal(greeting(new Date("2026-09-26T03:00:00Z")), "Good afternoon");
  assert.equal(greeting(new Date("2026-09-26T08:00:00Z")), "Good evening");
});

test("the sign-in code pop-up only runs locally in development", () => {
  const local = { NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55431" };
  assert.equal(devInboxEnabled(local), true);
  assert.equal(devInboxEnabled({ ...local, NODE_ENV: "production" }), false);
  assert.equal(devInboxEnabled({ ...local, DEV_CODE_POPUP: "off" }), false);
  assert.equal(devInboxEnabled({ ...local, NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" }), false);
  assert.equal(devInboxEnabled({ NODE_ENV: "development" }), false);
  assert.equal(devInboxUrl({ LOCAL_INBOX_URL: "https://evil.example.com" }), "http://127.0.0.1:55434");
  assert.equal(devInboxUrl({ LOCAL_INBOX_URL: "http://localhost:9999/x" }), "http://localhost:9999");
});

test("the newest matching code is read from the local inbox", async () => {
  assert.equal(extractCode("<p>Enter this code in the app:</p><p><strong>482913</strong></p>"), "482913");
  assert.equal(extractCode("no code here 12345"), undefined);

  const since = new Date("2026-09-26T01:00:00Z");
  const requested: string[] = [];
  const fetchImpl = (async (url: string) => {
    requested.push(url);
    if (url.includes("/api/v1/messages"))
      return Response.json({
        messages: [
          { ID: "old", Created: "2026-09-26T00:50:00Z", To: [{ Address: "a@example.com" }] },
          { ID: "other", Created: "2026-09-26T01:00:05Z", To: [{ Address: "b@example.com" }] },
          { ID: "new", Created: "2026-09-26T01:00:03Z", To: [{ Address: "A@example.com" }] },
        ],
      });
    return Response.json({ Text: url.endsWith("/new") ? "Your code: 654321" : "Your code: 111111" });
  }) as unknown as typeof fetch;

  assert.equal(await latestDevCode("a@example.com", since, { fetchImpl, inbox: "http://127.0.0.1:1" }), "654321");
  assert.ok(requested.some((u) => u.endsWith("/api/v1/message/new")));
  assert.equal(
    await latestDevCode("c@example.com", since, { fetchImpl, inbox: "http://127.0.0.1:1" }),
    undefined,
    "no code for an address that has no mail",
  );
  const broken = (async () => {
    throw new Error("down");
  }) as unknown as typeof fetch;
  assert.equal(await latestDevCode("a@example.com", since, { fetchImpl: broken }), undefined);
});
