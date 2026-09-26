import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  consultationsPerDay,
  dashboardCounts,
  followUpsThisWeek,
  greeting,
  isResultTask,
  pastNzDays,
  resultsToChase,
  reviewQueue,
  todaysTeam,
  type DashboardConsultation,
} from "../lib/dashboard/summary";
import { devInboxEnabled, devInboxUrl, extractCode, latestDevCode } from "../lib/dev-inbox";
import { buildDemoRoster } from "../scripts/demo-roster";
import { assertHostedUrl, parseClinicians } from "../scripts/seed-target";
import { demoConditions, demoMedications, demoPatients } from "../scripts/demo-patients";

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


const task = (id: string, title: string, dueAt?: string, patientId = `p-${id}`) => ({
  id,
  title,
  dueAt,
  patientId,
  patientName: `Patient ${patientId}`,
  status: "open" as const,
});

test("investigations are separated from other follow-ups", () => {
  for (const title of ["Chase urine culture result tomorrow.", "Repeat HbA1c in three months.", "Book CXR", "Check FBC and CRP", "Book exercise tolerance test."])
    assert.equal(isResultTask(title), true, title);
  for (const title of ["Phone Hemi tomorrow to check breathing.", "Review in one week.", "Chase cardiology referral acknowledgement."])
    assert.equal(isResultTask(title), false, title);
  assert.deepEqual(
    resultsToChase([task("1", "Chase bloods"), task("2", "Phone daughter"), { ...task("3", "X-ray knee"), status: "done" as const }]).map((t) => t.id),
    ["1"],
  );
});

test("follow-ups this week: one row per patient, soonest first, overdue flagged", () => {
  const rows = followUpsThisWeek(
    [
      task("1", "Review in one week", "2026-09-30T00:00:00Z", "hemi"),
      task("2", "Phone Hemi", "2026-09-26T05:00:00Z", "hemi"),
      task("3", "Call family", "2026-09-24T00:00:00Z", "priya"), // overdue
      task("4", "Recall in three months", "2026-12-25T00:00:00Z", "mei"), // too far
      task("5", "Chase bloods", "2026-09-27T00:00:00Z", "sione"), // a result, not a follow-up
      task("6", "Someday", undefined, "grace"),
    ],
    now,
  );
  assert.deepEqual(
    rows.map((r) => [r.patientId, r.next.id, r.count, r.overdue]),
    [
      ["priya", "3", 1, true],
      ["hemi", "2", 2, false],
    ],
  );
});

test("today's team groups doctors and nurses and flags who is on now", () => {
  const shift = (id: string, role: "doctor" | "nurse" | "reception", startsAt: string, endsAt: string) => ({
    id,
    staffName: `Staff ${id}`,
    role,
    area: "Ward",
    startsAt,
    endsAt,
  });
  const dayStart = "2026-09-25T12:00:00Z"; // midnight 26 Sep NZST
  const team = todaysTeam(
    [
      shift("night", "nurse", "2026-09-25T11:00:00Z", "2026-09-25T19:30:00Z"), // 23:00 -> 07:30, finished
      shift("early", "nurse", "2026-09-25T19:00:00Z", "2026-09-26T03:30:00Z"), // on now
      shift("desk", "reception", "2026-09-25T20:45:00Z", "2026-09-26T01:15:00Z"),
      shift("tomorrow", "doctor", "2026-09-26T20:00:00Z", "2026-09-27T05:00:00Z"), // not today
    ],
    dayStart,
    now,
  );
  assert.deepEqual(team.nurses.map((s) => [s.id, s.onNow, s.finished]), [
    ["night", false, true],
    ["early", true, false],
  ]);
  assert.deepEqual(team.doctors, []);
  assert.deepEqual(team.others.map((s) => s.id), ["desk"]);
  assert.equal(team.onNowCount, 2);
  assert.deepEqual(team.gaps, ["No doctor rostered today"]);
});

test("hosted seeding only accepts a supabase.co project and real clinician emails", () => {
  assert.equal(assertHostedUrl("https://abcdefgh.supabase.co/"), "https://abcdefgh.supabase.co");
  assert.throws(() => assertHostedUrl("http://abcdefgh.supabase.co"));
  assert.throws(() => assertHostedUrl("https://127.0.0.1:55431"));
  assert.throws(() => assertHostedUrl(undefined));
  const one = parseClinicians("Ollie@Example.com:Dr Ollie Yates");
  assert.deepEqual(one.a, { email: "ollie@example.com", fullName: "Dr Ollie Yates", roster: true });
  assert.deepEqual(one.b, one.a);
  assert.equal(parseClinicians("a@x.co, b@y.co:Dr B").b.fullName, "Dr B");
  const four = parseClinicians("a@x.co:Dr A,b@y.co:Dr B,c@z.co:Dr C,A@x.co:Dup,d@w.co:Dr D");
  assert.deepEqual(four.all.map((c) => c.email), ["a@x.co", "b@y.co", "c@z.co", "d@w.co"]);
  assert.equal(four.b.email, "b@y.co");
  assert.throws(() => parseClinicians(""));
  assert.throws(() => parseClinicians("not-an-email"));
});


test("hosted demo patients match supabase/seed.sql exactly", () => {
  const sql = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  const section = (table: string) => sql.split(`insert into public.${table}`)[1].split(";")[0];
  const rows = (table: string) => (section(table).match(/\n {2}\(/g) ?? []).length;
  assert.equal(rows("patients"), demoPatients.length);
  assert.equal(rows("medications"), demoMedications.length);
  assert.equal(rows("medical_conditions"), demoConditions.length);
  for (const p of demoPatients)
    assert.ok(
      section("patients").includes(`('${p.id}', '${p.first_name}', '${p.last_name}', '${p.date_of_birth}'`) &&
        section("patients").includes(`'${p.nhi}')`),
      `${p.first_name} differs from seed.sql`,
    );
  for (const m of demoMedications)
    assert.ok(section("medications").includes(`('${m.patient_id}', '${m.name}', '${m.dose}', '${m.frequency}'`), m.name);
  for (const c of demoConditions)
    assert.ok(section("medical_conditions").includes(`('${c.patient_id}', '${c.condition}'`), c.condition);
});

test("the team roster starts friends at 4pm and leaves no-roster people off", () => {
  const team = parseClinicians(
    "a@x.co:Dr A,b@y.co:Dr B,liam@z.co:Dr Liam Yeo,mel@w.co:Dr Mel Yates:no-roster",
  );
  assert.equal(team.all.find((c) => c.email === "mel@w.co")?.fullName, "Dr Mel Yates");
  assert.equal(team.all.find((c) => c.email === "mel@w.co")?.roster, false);
  const shifts = buildDemoRoster(team, Date.parse("2026-09-26T02:00:00Z")); // 2pm Sat NZ
  assert.ok(!shifts.some((s) => s.staff_name === "Dr Mel Yates"), "Mel is not rostered");
  const liamToday = shifts.find(
    (s) => s.staff_name === "Dr Liam Yeo" && s.starts_at === "2026-09-26T04:00:00.000Z",
  );
  assert.ok(liamToday, "Liam starts at 4pm NZ today");
  assert.equal(liamToday!.ends_at, "2026-09-26T12:00:00.000Z", "and finishes at midnight");
  assert.ok(shifts.some((s) => s.staff_name === "Dr A") && shifts.some((s) => s.staff_name === "Dr B"));
  assert.ok(shifts.some((s) => s.role === "nurse"));
});
