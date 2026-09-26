import test from "node:test";
import assert from "node:assert/strict";
import {
  audioExtension,
  audioSchema,
  clinicalNoteSchema,
  maxAudioBytes,
  patientSearchSchema,
  transcribeSchema,
} from "../lib/validation";
import {
  toClinicalNote,
  toConsultation,
  toMedication,
  toPatient,
} from "../lib/data/mappers";

test("patient search accepts names and IDs but not filter syntax", () => {
  for (const q of ["", "Aroha", "  o'brien ", "Demo-Ngata", "Māui Tane"])
    assert.equal(patientSearchSchema.safeParse(q).success, true, q);
  assert.equal(
    patientSearchSchema.parse(" 00000000-0000-4000-8000-000000000001 "),
    "00000000-0000-4000-8000-000000000001",
  );
  for (const q of ["a,id.eq.x", "name)", "50%", "a.b", "x".repeat(101)])
    assert.equal(patientSearchSchema.safeParse(q).success, false, q);
});

test("clinical notes fill missing fields and reject oversized content", () => {
  const note = clinicalNoteSchema.parse({ reasonForVisit: "  Cough  " });
  assert.equal(note.reasonForVisit, "Cough");
  assert.equal(note.plan, "");
  assert.deepEqual(note.currentMedications, []);
  assert.equal(
    clinicalNoteSchema.safeParse({ history: "x".repeat(8001) }).success,
    false,
  );
  assert.equal(toClinicalNote(null), undefined);
  assert.equal(toClinicalNote("not a note"), undefined);
});

test("rows map to domain types without leaking nulls", () => {
  assert.deepEqual(
    toPatient({
      id: "p1",
      first_name: "Aroha",
      last_name: "Demo",
      date_of_birth: "1984-03-12",
      email: null,
      phone: "021",
      nhi: "ZZZ0016",
      created_by: null,
      created_at: "",
      updated_at: "",
    }),
    {
      id: "p1",
      firstName: "Aroha",
      lastName: "Demo",
      dateOfBirth: "1984-03-12",
      email: undefined,
      phone: "021",
      nhi: "ZZZ0016",
    },
  );
  assert.equal(
    toMedication({
      id: "m1",
      patient_id: "p1",
      name: "Metformin",
      dose: "500 mg",
      frequency: "BD",
      route: null,
      start_date: null,
      end_date: null,
      status: "stopped",
      notes: null,
      created_by: null,
      created_at: "",
    }).status,
    "stopped",
  );
  const consultation = toConsultation({
    id: "c1",
    patient_id: "p1",
    doctor_id: "d1",
    consulted_at: "2026-09-25T00:00:00Z",
    status: "finalised",
    audio_path: null,
    transcript: "Patient reports a cough.",
    generated_draft: { reasonForVisit: "Cough" },
    final_note: { reasonForVisit: "Cough", plan: "Rest" },
    finalised_by: "d2",
    finalised_at: "2026-09-25T01:00:00Z",
    created_at: "",
    updated_at: "",
  });
  assert.equal(consultation.date, "2026-09-25T00:00:00Z");
  assert.equal(consultation.finalNote?.plan, "Rest");
  assert.equal(consultation.generatedDraft?.plan, "");
  assert.equal(consultation.finalisedBy, "d2");
});

test("transcribe input accepts recorder audio and rejects anything else", () => {
  const consultationId = "00000000-0000-4000-8000-000000000001";
  const webm = new Blob([new Uint8Array([1])], {
    type: "audio/webm;codecs=opus",
  });
  assert.equal(audioExtension(webm.type), "webm");
  assert.equal(audioExtension("audio/mp4"), "m4a");
  assert.equal(
    transcribeSchema.safeParse({ consultationId, audio: webm }).success,
    true,
  );
  assert.equal(
    transcribeSchema.safeParse({ consultationId }).success,
    true,
    "a retry reuses the stored recording",
  );
  for (const audio of [
    new Blob([], { type: "audio/webm" }),
    new Blob(["x"], { type: "video/webm" }),
    new Blob(["x"], { type: "text/plain" }),
    "not a file",
  ])
    assert.equal(
      transcribeSchema.safeParse({ consultationId, audio }).success,
      false,
    );
  assert.equal(
    transcribeSchema.safeParse({ consultationId: "nope", audio: webm }).success,
    false,
  );
  const oversized = { size: maxAudioBytes + 1, type: "audio/webm" };
  Object.setPrototypeOf(oversized, Blob.prototype);
  assert.equal(audioSchema.safeParse(oversized).success, false);
});
