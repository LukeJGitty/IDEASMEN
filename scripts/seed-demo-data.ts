/**
 * Demo data: consultations (finalised, in review, AI draft, just
 * transcribed), tasks (overdue, today, coming up, done) and a 7-day roster, all
 * relative to "now" so the demo always looks live. Fictional people only.
 *
 * Local: run after `pnpm db:reset`:  pnpm db:seed-demo
 * Hosted demo project: pnpm db:seed-hosted (see scripts/seed-target.ts and docs/DEPLOYMENT.md).
 * Safe to re-run: it replaces its own rows (fixed IDs) and leaves everything else.
 */
import assert from "node:assert/strict";
import type { Json } from "../lib/database.types";
import { demoConditions, demoMedications, demoPatients } from "./demo-patients";
import { buildDemoRoster } from "./demo-roster";
import { composeLetter, mockLetterBody } from "../lib/referrals/letter";
import { ensureClinicians, resolveTarget } from "./seed-target";

const P = (n: number) => `00000000-0000-4000-8000-00000000000${n}`; // seed.sql patients
const id = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Note = {
  reasonForVisit: string;
  history: string;
  relevantMedicalHistory: string;
  currentMedications: string[];
  observations: string;
  assessment: string;
  plan: string;
  followUp: string;
};
const note = (n: Note) => n as unknown as Json;

const consultations: {
  n: number;
  patient: number;
  by: "a" | "b";
  hoursAgo: number;
  status: "transcribing" | "draft_generated" | "reviewing" | "finalised";
  transcript: string;
  draft?: Note;
  final?: Note;
}[] = [
  {
    n: 1, patient: 1, by: "a", hoursAgo: 2, status: "finalised",
    transcript: `Clinician: Kia ora Aroha, what brings you in today?
Patient: I've had a dry cough for about ten days. It's worse at night and my inhaler isn't helping as much.
Clinician: Any fever or shortness of breath?
Patient: A bit wheezy on the stairs. No fever.
Clinician: Your chest has a mild wheeze, oxygen is 97 percent and temperature is normal. Peak flow is 380, down from your usual 450.
Clinician: I think this is a post-viral cough setting off your asthma. We'll start a preventer inhaler twice daily and keep the reliever as needed.
Clinician: Come back in one week if it's not settling, or sooner if you're short of breath.`,
    draft: {
      reasonForVisit: "Dry cough for ten days, worse at night.",
      history: "Wheezy on stairs. No fever. Reliever less effective.",
      relevantMedicalHistory: "Asthma (since 2019).",
      currentMedications: ["Salbutamol inhaler 100 mcg As needed"],
      observations: "Mild wheeze. SpO2 97%. Afebrile. Peak flow 380 (usual 450).",
      assessment: "Post-viral cough with asthma exacerbation.",
      plan: "Start preventer inhaler twice daily. Continue salbutamol as needed.",
      followUp: "Review in one week if not settling, sooner if short of breath.",
    },
  },
  {
    n: 2, patient: 2, by: "b", hoursAgo: 26, status: "finalised",
    transcript: `Clinician: Morning Tane, this is your diabetes check.
Patient: Feeling pretty good. Walking most days now.
Clinician: Blood pressure is 134 over 82 and your HbA1c came back at 58, better than last time. Kidney function result isn't back yet.
Clinician: Keep going with the metformin. We'll repeat the HbA1c in three months and I'll refer you for retinal screening.`,
    draft: {
      reasonForVisit: "Diabetes review.",
      history: "Walking most days. Feels well.",
      relevantMedicalHistory: "Type 2 diabetes (since 2015). Hypercholesterolaemia (since 2016).",
      currentMedications: ["Metformin 500 mg Twice daily", "Atorvastatin 20 mg Once daily"],
      observations: "BP 134/82. HbA1c 58 mmol/mol (improved).",
      assessment: "Type 2 diabetes, control improving.",
      plan: "Continue metformin. Chase eGFR result from lab. Refer to retinal screening.",
      followUp: "Repeat HbA1c in three months.",
    },
  },
  {
    n: 3, patient: 4, by: "a", hoursAgo: 1, status: "draft_generated",
    transcript: `Clinician: Hemi, how's the breathing?
Patient: Worse the last three days. More phlegm, it's gone green, and I'm puffed walking to the letterbox.
Clinician: Oxygen is 91 percent, breathing rate 24, temperature 37.9. There are crackles at the right base.
Clinician: This looks like a COPD flare, possibly with a chest infection. We'll start prednisone and an antibiotic, and get a chest X-ray today.
Clinician: I'll call you tomorrow to check in, and come straight back if you get more breathless.`,
    draft: {
      reasonForVisit: "Worsening breathlessness for three days.",
      history: "Increased green sputum. Breathless walking to the letterbox.",
      relevantMedicalHistory: "COPD (since 2018).",
      currentMedications: ["Tiotropium inhaler 18 mcg Once daily", "Salbutamol inhaler 100 mcg As needed"],
      observations: "SpO2 91%. RR 24. Temp 37.9. Crackles right base.",
      assessment: "COPD exacerbation, possible lower respiratory tract infection.",
      plan: "Start prednisone and antibiotic. Chest X-ray today.",
      followUp: "Phone check tomorrow. Return urgently if more breathless.",
    },
  },
  {
    n: 4, patient: 5, by: "b", hoursAgo: 4, status: "reviewing",
    transcript: `Clinician: Priya, your daughter says you've been a bit muddled.
Patient: I've been going to the toilet a lot and it stings.
Clinician: Temperature 38.1, heart rate 104, blood pressure 118 over 70. Urine dip is positive for nitrites.
Clinician: This is likely a urine infection causing some confusion. We'll send a urine culture and start antibiotics. I'll phone your daughter today with an update.`,
    draft: {
      reasonForVisit: "Urinary frequency and dysuria with new confusion.",
      history: "Daughter reports two days of confusion.",
      relevantMedicalHistory: "Hypertension (since 2020).",
      currentMedications: ["Cilazapril 2.5 mg Once daily"],
      observations: "Temp 38.1. HR 104. BP 118/70. Urine dip nitrite positive.",
      assessment: "Likely UTI with delirium.",
      plan: "Urine culture sent. Start antibiotics. Phone daughter with update today.",
      followUp: "Chase urine culture result tomorrow.",
    },
  },
  {
    n: 5, patient: 6, by: "a", hoursAgo: 72, status: "finalised",
    transcript: `Clinician: Jack, tell me about the chest pain.
Patient: Tight feeling when I walk up hills, goes away when I stop.
Clinician: ECG today is normal and your blood pressure is 128 over 80. I'd like cardiology to see you, and we'll book an exercise test.`,
    draft: {
      reasonForVisit: "Exertional chest tightness.",
      history: "Tightness walking uphill, settles with rest.",
      relevantMedicalHistory: "Gastro-oesophageal reflux (since 2024).",
      currentMedications: ["Omeprazole 20 mg Once daily"],
      observations: "ECG normal. BP 128/80.",
      assessment: "Possible stable angina.",
      plan: "Refer to cardiology. Book exercise tolerance test.",
      followUp: "Return urgently if pain at rest.",
    },
  },
  {
    n: 6, patient: 7, by: "a", hoursAgo: 0.5, status: "transcribing",
    transcript: `Clinician: Sione, let's have a look at that foot.
Patient: The sore on my right big toe has been there two weeks and it's getting red.
Clinician: There's a 1 centimetre ulcer with redness around it, temperature 37.6. Foot pulses are present.
Clinician: I think the ulcer is infected. We'll swab it, start antibiotics, get bloods for HbA1c and CRP, and refer you to the podiatrist.
Clinician: Come back in five days so we can check it.`,
  },
];

const tasks: {
  n: number;
  patient: number;
  consultation?: number;
  title: string;
  dueHours?: number;
  assigned: "a" | "b";
  done?: boolean;
}[] = [
  { n: 1, patient: 1, consultation: 1, title: "Review in one week if not settling, sooner if short of breath.", dueHours: 24 * 7, assigned: "a" },
  { n: 2, patient: 2, consultation: 2, title: "Chase eGFR result from lab.", dueHours: -20, assigned: "a" },
  { n: 3, patient: 2, consultation: 2, title: "Refer to retinal screening.", assigned: "b" },
  { n: 4, patient: 2, consultation: 2, title: "Repeat HbA1c in three months.", dueHours: 24 * 90, assigned: "b" },
  { n: 5, patient: 5, title: "Phone daughter with update today.", dueHours: 3, assigned: "b" },
  { n: 6, patient: 5, title: "Chase urine culture result tomorrow.", dueHours: 22, assigned: "a" },
  { n: 7, patient: 6, consultation: 5, title: "Chase cardiology referral acknowledgement.", dueHours: -48, assigned: "b" },
  { n: 8, patient: 6, consultation: 5, title: "Book exercise tolerance test.", dueHours: -24, assigned: "a", done: true },
  { n: 9, patient: 4, title: "Phone Hemi tomorrow to check breathing.", dueHours: 20, assigned: "a" },
  { n: 10, patient: 3, title: "Send physio letter for ankle rehab.", dueHours: -72, assigned: "b", done: true },
];

async function main() {
  const target = resolveTarget();
  const { admin } = target;
  const doctors = await ensureClinicians(target);

  const demoPatientIds = demoPatients.map((p) => p.id!);
  const { data: patients, error: patientsError } = await admin.from("patients").select("id").limit(1000);
  assert.equal(patientsError, null, patientsError?.message);
  const found = new Set((patients ?? []).map((p) => p.id));

  if (target.hosted) {
    // A hosted project never runs seed.sql, so load the same fictional patients here.
    assert.ok(
      [...found].every((pid) => demoPatientIds.includes(pid)),
      "This hosted project has patients that are not demo patients. Refusing to seed demo data into it.",
    );
    const upserted = await admin.from("patients").upsert(demoPatients, { onConflict: "id" });
    assert.equal(upserted.error, null, upserted.error?.message);
    assert.equal((await admin.from("medications").delete().in("patient_id", demoPatientIds)).error, null);
    assert.equal((await admin.from("medical_conditions").delete().in("patient_id", demoPatientIds)).error, null);
    const meds = await admin.from("medications").insert(demoMedications);
    assert.equal(meds.error, null, meds.error?.message);
    const conditions = await admin.from("medical_conditions").insert(demoConditions);
    assert.equal(conditions.error, null, conditions.error?.message);
  } else {
    assert.ok(
      demoPatientIds.every((pid) => found.has(pid)),
      "Run pnpm db:reset first so the demo patients exist.",
    );
  }

  const now = Date.now();
  const at = (hours: number) => new Date(now + hours * 3_600_000).toISOString();

  // Replace this script's own rows only.
  const taskIds = tasks.map((t) => id("da", t.n));
  const demoReferralId = id("db", 1);
  assert.equal((await admin.from("referrals").delete().eq("id", demoReferralId)).error, null);
  const consultationIds = consultations.map((c) => id("dc", c.n));
  assert.equal((await admin.from("tasks").delete().in("id", taskIds)).error, null);
  assert.equal((await admin.from("consultations").delete().in("id", consultationIds)).error, null);
  assert.equal((await admin.from("roster_shifts").delete().like("notes", "demo%")).error, null);

  const { error: consultationError } = await admin.from("consultations").insert(
    consultations.map((c) => {
      const finalNote = c.status === "finalised" || c.status === "reviewing" ? (c.final ?? c.draft) : undefined;
      return {
        id: id("dc", c.n),
        patient_id: P(c.patient),
        doctor_id: doctors[c.by],
        consulted_at: at(-c.hoursAgo),
        status: c.status,
        transcript: c.transcript,
        generated_draft: c.draft ? note(c.draft) : null,
        final_note: finalNote ? note(finalNote) : null,
        finalised_by: c.status === "finalised" ? doctors[c.by] : null,
        finalised_at: c.status === "finalised" ? at(-c.hoursAgo + 0.25) : null,
      };
    }),
  );
  assert.equal(consultationError, null, consultationError?.message);

  const { error: taskError } = await admin.from("tasks").insert(
    tasks.map((t) => ({
      id: id("da", t.n),
      patient_id: P(t.patient),
      consultation_id: t.consultation ? id("dc", t.consultation) : null,
      title: t.title,
      due_at: t.dueHours === undefined ? null : at(t.dueHours),
      assigned_to: doctors[t.assigned],
      source: t.consultation ? "note" : "manual",
      created_by: doctors[t.assigned],
    })),
  );
  assert.equal(taskError, null, taskError?.message);
  // New tasks must start open; the database stamps completion on the update.
  const doneIds = tasks.filter((t) => t.done).map((t) => id("da", t.n));
  assert.equal((await admin.from("tasks").update({ status: "done" }).in("id", doneIds)).error, null);

  // One referral already in flight: Jack's cardiology referral, chased by task 7.
  const jack = demoPatients.find((p) => p.id === P(6))!;
  const jackNote = consultations.find((c) => c.n === 5)!.draft!;
  const { error: referralError } = await admin.from("referrals").insert({
    id: demoReferralId,
    patient_id: P(6),
    consultation_id: id("dc", 5),
    facility_id: "f0000000-0000-4000-8000-000000000011", // Christchurch Heart Group
    service: "cardiology",
    urgency: "soon",
    reason: "Exertional chest tightness, possible stable angina. ECG normal.",
    letter: composeLetter({
      facilityName: "Christchurch Heart Group",
      service: "cardiology",
      urgency: "soon",
      patientName: `${jack.first_name} ${jack.last_name}`,
      dateOfBirth: jack.date_of_birth,
      nhi: jack.nhi ?? undefined,
      body: mockLetterBody({
        facilityName: "Christchurch Heart Group",
        service: "cardiology",
        urgency: "soon",
        reason: "Exertional chest tightness, possible stable angina. ECG normal.",
        age: 45,
        note: jackNote,
        medications: [],
        conditions: [],
      }),
      clinicianName: target.clinicians.a.fullName,
      date: new Date(now - 72 * 3_600_000),
    }),
    task_id: id("da", 7),
    created_by: doctors.a,
    created_at: at(-72),
  });
  assert.equal(referralError, null, referralError?.message);

  const shifts = buildDemoRoster(target.clinicians, now);
  const { error: rosterError } = await admin.from("roster_shifts").insert(shifts);
  assert.equal(rosterError, null, rosterError?.message);

  console.log(
    `Demo data ready: ${consultations.length} consultations, ${tasks.length} tasks, ${shifts.length} roster shifts.`,
  );
  console.log("Try: search NHI ZZZ0075 (Sione, ready to generate a draft), or open Tasks, Handover and Roster.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seeding demo data failed");
  process.exitCode = 1;
});
