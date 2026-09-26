import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildLetterPrompt,
  cleanLetterBody,
  composeLetter,
  letterBodyWithOpenAI,
  mockLetterBody,
  LetterError,
  type LetterInput,
} from "../lib/referrals/letter";
import {
  SERVICE_KEYS,
  chaseTask,
  compareFacilities,
  facilityUpdateSchema,
  formatFee,
  formatWait,
  referralCreateSchema,
  suggestServices,
} from "../lib/referrals/logic";
import type { ReferralFacility } from "../types/referral";

const facility = (id: string, over: Partial<ReferralFacility>): ReferralFacility => ({
  id,
  name: `Facility ${id}`,
  services: ["xray"],
  sector: "private",
  address: "1 Main St",
  accFunded: false,
  accepting: true,
  waitIsEstimate: true,
  updatedAt: "2026-09-26T00:00:00Z",
  ...over,
});

test("services are suggested from the clinician's plan", () => {
  assert.deepEqual(suggestServices({ plan: "X-ray the wrist today and refer to fracture clinic if a scaphoid fracture is seen." }), [
    "fracture_clinic",
    "xray",
  ]);
  assert.deepEqual(suggestServices({ assessment: "Exertional chest pain.", plan: "Refer to cardiology." }), ["cardiology"]);
  assert.deepEqual(suggestServices({ plan: "Start physio for the ankle." }), ["physiotherapy"]);
  assert.deepEqual(suggestServices({ plan: "Rest and fluids." }), []);
  assert.deepEqual(suggestServices(undefined), []);
});

test("facilities are compared: accepting first, then shortest wait, unknowns last", () => {
  const list = [
    facility("slow", { waitDays: 30, feeNzd: 0 }),
    facility("fast", { waitDays: 1, feeNzd: 200 }),
    facility("unknown", {}),
    facility("closed", { waitDays: 0, accepting: false }),
    facility("other", { services: ["cardiology"], waitDays: 0 }),
  ];
  assert.deepEqual(compareFacilities(list, "xray", "wait").map((f) => f.id), ["fast", "slow", "unknown", "closed"]);
  assert.deepEqual(compareFacilities(list, "xray", "cost").map((f) => f.id), ["slow", "fast", "unknown", "closed"]);
});

test("wait and price read naturally and flag estimates", () => {
  assert.equal(formatWait({ waitDays: 0, waitIsEstimate: false, accepting: true }), "Same day");
  assert.equal(formatWait({ waitDays: 21, waitIsEstimate: true, accepting: true }), "About 3 weeks (estimate)");
  assert.equal(formatWait({ waitDays: 150, waitIsEstimate: false, accepting: true }), "About 5 months");
  assert.equal(formatWait({ waitDays: 3, waitIsEstimate: false, accepting: false }), "Not accepting referrals");
  assert.equal(formatFee({ feeNzd: 0, sector: "public" }), "Free");
  assert.equal(formatFee({ feeNzd: undefined, sector: "private" }), "Price on request");
  assert.equal(formatFee({ feeNzd: 70, sector: "private" }), "From $70");
});

test("chase tasks are due sooner for urgent referrals", () => {
  const now = new Date("2026-09-26T00:00:00Z");
  const urgent = chaseTask("Christchurch Heart Group", "urgent", now);
  assert.equal(urgent.title, "Chase Christchurch Heart Group referral acknowledgement");
  assert.equal(urgent.dueAt, "2026-09-27T00:00:00.000Z");
  assert.equal(chaseTask("X", "routine", now).dueAt, "2026-10-03T00:00:00.000Z");
});

test("referral forms reject anything outside the contract", () => {
  const ok = {
    patientId: "00000000-0000-4000-8000-000000000001",
    facilityId: "f0000000-0000-4000-8000-000000000001",
    service: "fracture_clinic",
    urgency: "urgent",
    reason: "Suspected scaphoid fracture",
    letter: "Dear colleague",
  };
  assert.equal(referralCreateSchema.safeParse(ok).success, true);
  assert.equal(referralCreateSchema.safeParse({ ...ok, service: "magic" }).success, false);
  assert.equal(referralCreateSchema.safeParse({ ...ok, letter: "  " }).success, false);
  assert.equal(referralCreateSchema.safeParse({ ...ok, facilityId: "" }).success, false);
  const edit = facilityUpdateSchema.parse({ id: ok.facilityId, accepting: true, waitDays: "", feeNzd: "45", priceNote: " " });
  assert.equal(edit.waitDays, undefined);
  assert.equal(edit.feeNzd, 45);
  assert.equal(edit.priceNote, undefined);
  assert.equal(facilityUpdateSchema.safeParse({ id: ok.facilityId, accepting: true, waitDays: "-1" }).success, false);
});

const input: LetterInput = {
  facilityName: "Christchurch Hospital Orthopaedic Services",
  service: "fracture_clinic",
  urgency: "urgent",
  reason: "Suspected scaphoid fracture after a fall",
  age: 42,
  note: {
    reasonForVisit: "Fell on outstretched hand yesterday.",
    history: "Pain at the base of the thumb.",
    relevantMedicalHistory: "",
    currentMedications: [],
    observations: "Tender in the anatomical snuffbox.",
    assessment: "Possible scaphoid fracture.",
    plan: "Thumb spica splint and fracture clinic referral.",
    followUp: "",
  },
  medications: [{ id: "m", patientId: "p", name: "Salbutamol inhaler", dose: "100 mcg", frequency: "PRN", status: "active" }],
  conditions: [{ id: "c", patientId: "p", condition: "Asthma", status: "active" }],
};

test("the letter prompt carries clinical facts but no identifiers", () => {
  const prompt = buildLetterPrompt(input);
  assert.match(prompt, /Fracture clinic at Christchurch Hospital Orthopaedic Services/);
  assert.match(prompt, /anatomical snuffbox/);
  assert.match(prompt, /Asthma/);
  assert.match(prompt, /Patient age: 42/);
  assert.doesNotMatch(prompt, /NHI|ZZZ\d|born/i);
});

test("the offline letter only restates the record", () => {
  const body = mockLetterBody(input);
  assert.match(body, /aged 42/);
  assert.match(body, /Suspected scaphoid fracture after a fall\./);
  assert.match(body, /Findings: Tender in the anatomical snuffbox\./);
  assert.match(body, /Salbutamol inhaler 100 mcg PRN/);
  const empty = mockLetterBody({ ...input, note: undefined, medications: [], conditions: [] });
  assert.match(empty, /Presentation: \[to confirm\]/);
});

test("Hippo adds the header and sign-off around the AI body", () => {
  const letter = composeLetter({
    facilityName: "Christchurch Heart Group",
    service: "cardiology",
    urgency: "soon",
    patientName: "Jack Demo-Thompson",
    dateOfBirth: "1981-09-08",
    nhi: "ZZZ0067",
    body: "Please review.",
    clinicianName: "Dr Ollie Yates",
    date: new Date("2026-09-26T01:00:00Z"),
  });
  assert.match(letter, /^26 September 2026\n/);
  assert.match(letter, /To: Cardiology, Christchurch Heart Group/);
  assert.match(letter, /Re: Jack Demo-Thompson, born 8 September 1981, NHI ZZZ0067/);
  assert.match(letter, /Dear colleague,\n\nPlease review\.\n\nKind regards,\n\nDr Ollie Yates$/);
});

test("model letters are cleaned and failures surface safely", async () => {
  assert.equal(cleanLetterBody("Dear Doctor,\nPlease see.\n\nKind regards,\nDr X"), "Please see.");
  assert.throws(() => cleanLetterBody("Dear Doctor,\n"), LetterError);
  assert.equal(cleanLetterBody("Many thanks for seeing her.\nShe fell."), "Many thanks for seeing her.\nShe fell.");

  const calls: RequestInit[] = [];
  const ok = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    return Response.json({ choices: [{ message: { content: "Thank you for seeing this patient.\nRegards" } }] });
  }) as unknown as typeof fetch;
  assert.equal(await letterBodyWithOpenAI(input, { apiKey: "k", fetchImpl: ok }), "Thank you for seeing this patient.");
  const sent = JSON.parse(String(calls[0].body));
  assert.equal(sent.messages[0].role, "system");
  assert.doesNotMatch(sent.messages[1].content, /ZZZ/);

  const failing = (async () => new Response("echo of the note", { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(letterBodyWithOpenAI(input, { apiKey: "k", fetchImpl: failing }), (e: unknown) => {
    assert.ok(e instanceof LetterError);
    assert.doesNotMatch((e as Error).message, /echo/);
    return true;
  });
});

test("the migration's service list matches the app's", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260927000000_referrals.sql", import.meta.url), "utf8");
  for (const key of SERVICE_KEYS) assert.ok(sql.includes(`'${key}'`), key);
  const facilities = sql.match(/'f0000000-0000-4000-8000-0000000000\d\d'/g) ?? [];
  assert.equal(new Set(facilities).size, 17);
});
