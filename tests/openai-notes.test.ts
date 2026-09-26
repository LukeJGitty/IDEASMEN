import test from "node:test";
import assert from "node:assert/strict";
import { NoteGenerationError, type NoteContext } from "../lib/notes/generation";
import { NOTE_FIELDS } from "../lib/notes/form";
import {
  DEFAULT_OPENAI_NOTE_MODEL,
  OPENAI_NOTE_SCHEMA,
  generateNoteWithOpenAI,
} from "../lib/notes/openai";

const context: NoteContext = {
  medications: [
    { id: "m1", patientId: "p", name: "Metformin", dose: "500 mg", frequency: "BD", status: "active" },
  ],
  conditions: [],
};

const note = {
  reasonForVisit: "Cough for two weeks",
  history: "Productive cough, worse at night.",
  relevantMedicalHistory: "",
  currentMedications: ["Metformin 500 mg BD"],
  observations: "Temp 37.4, chest clear.",
  assessment: "Likely viral chest infection.",
  plan: "Paracetamol, fluids.",
  followUp: "Return in one week if not improving.",
};

function fakeFetch(respond: () => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const completion = (content: string | null, refusal: string | null = null) =>
  Response.json({ choices: [{ message: { content, refusal } }] });

test("OpenAI note request uses a strict schema and fences the transcript", async () => {
  const { impl, calls } = fakeFetch(() => completion(JSON.stringify(note)));
  const result = await generateNoteWithOpenAI("Patient: I have a cough.", context, {
    apiKey: "test-key",
    fetchImpl: impl,
  });
  assert.deepEqual(result, note);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/chat/completions");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.model, DEFAULT_OPENAI_NOTE_MODEL);
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages[1].content, /<transcript>\nPatient: I have a cough\.\n<\/transcript>/);
  assert.match(body.messages[1].content, /Metformin/);
  assert.doesNotMatch(body.messages[1].content, /record_clinical_note/);
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
});

test("OpenAI schema lists every note field as required with no extras", () => {
  const keys = NOTE_FIELDS.map(({ key }) => key).sort();
  assert.deepEqual([...OPENAI_NOTE_SCHEMA.required].sort(), keys);
  assert.deepEqual(Object.keys(OPENAI_NOTE_SCHEMA.properties).sort(), keys);
  assert.equal(OPENAI_NOTE_SCHEMA.additionalProperties, false);
});

test("OpenAI note model can be overridden", async () => {
  const { impl, calls } = fakeFetch(() => completion(JSON.stringify(note)));
  await generateNoteWithOpenAI("hi", context, { apiKey: "k", model: "other-model", fetchImpl: impl });
  assert.equal(JSON.parse(String(calls[0].init.body)).model, "other-model");
});

test("OpenAI note failures become NoteGenerationError without leaking details", async () => {
  const cases: [string, typeof fetch][] = [
    [
      "network",
      (async () => {
        throw new Error("secret detail");
      }) as unknown as typeof fetch,
    ],
    ["status", fakeFetch(() => new Response("echoed transcript", { status: 429 })).impl],
    ["refusal", fakeFetch(() => completion(null, "I can't help with that.")).impl],
    ["bad json", fakeFetch(() => completion("not json")).impl],
    ["wrong shape", fakeFetch(() => completion(JSON.stringify({ history: "x".repeat(9000) }))).impl],
  ];
  for (const [name, impl] of cases) {
    await assert.rejects(
      generateNoteWithOpenAI("hi", context, { apiKey: "k", fetchImpl: impl }),
      (error: unknown) => {
        assert.ok(error instanceof NoteGenerationError, name);
        assert.doesNotMatch((error as Error).message, /secret detail|echoed transcript/, name);
        return true;
      },
    );
  }
});
