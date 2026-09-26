import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OPENAI_TRANSCRIBE_MODEL,
  ProviderError,
  transcribeWithOpenAI,
} from "../lib/transcription/openai";

const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" });

test("OpenAI transcription sends the audio with the right name, model and key", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return Response.json({ text: "  Kia ora, I've had a cough for a week.  " });
  }) as unknown as typeof fetch;

  const result = await transcribeWithOpenAI(audio, { apiKey: "test-key", fetchImpl: fakeFetch });
  assert.equal(result.text, "Kia ora, I've had a cough for a week.");
  assert.equal(seen?.url, "https://api.openai.com/v1/audio/transcriptions");
  assert.equal((seen?.init.headers as Record<string, string>).Authorization, "Bearer test-key");
  const body = seen?.init.body as FormData;
  assert.equal((body.get("file") as File).name, "consultation.webm");
  assert.equal(body.get("model"), DEFAULT_OPENAI_TRANSCRIBE_MODEL);
  assert.equal(body.get("language"), "en");
});

test("OpenAI transcription failures become provider errors without leaking details", async () => {
  const status = (code: number) =>
    (async () => new Response("secret request echo", { status: code })) as unknown as typeof fetch;
  await assert.rejects(
    transcribeWithOpenAI(audio, { apiKey: "k", fetchImpl: status(401) }),
    (error: Error) => error instanceof ProviderError && !error.message.includes("secret"),
  );
  const offline = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  await assert.rejects(transcribeWithOpenAI(audio, { apiKey: "k", fetchImpl: offline }), ProviderError);
  const silent = (async () => Response.json({ text: "   " })) as unknown as typeof fetch;
  await assert.rejects(transcribeWithOpenAI(audio, { apiKey: "k", fetchImpl: silent }), ProviderError);
  await assert.rejects(
    transcribeWithOpenAI(new Blob([]), { apiKey: "k", fetchImpl: silent }),
    ProviderError,
  );
});

import { isSampleTranscript, MOCK_TRANSCRIPT, noteProviderFrom, transcriptionProviderFrom } from "../lib/providers";

test("provider settings are forgiving of spaces, quotes, capitals and comments", () => {
  for (const v of ["openai", " openai ", "OpenAI", "'openai'", '"openai"', "openai # real AI", "openai\r"])
    assert.equal(transcriptionProviderFrom(v), "openai", JSON.stringify(v));
  assert.equal(transcriptionProviderFrom(undefined), "mock");
  assert.equal(transcriptionProviderFrom(""), "mock");
  assert.equal(transcriptionProviderFrom("whisper"), "whisper", "unknown values still fail loudly");
  assert.equal(noteProviderFrom(" OPENAI"), "openai");
  assert.equal(noteProviderFrom("anthropic"), "anthropic");
  assert.equal(noteProviderFrom("nonsense"), "mock");
  assert.equal(isSampleTranscript(`\n${MOCK_TRANSCRIPT}\n`), true);
  assert.equal(isSampleTranscript("Patient: my knee hurts."), false);
});

import { explainOpenAIError, openAIErrorReason } from "../lib/openai-errors";

test("OpenAI errors are explained in plain words without echoing the request", async () => {
  assert.match(explainOpenAIError(401), /rejected the API key/);
  assert.match(explainOpenAIError(429, "insufficient_quota"), /no credit/);
  assert.match(explainOpenAIError(429), /rate-limiting/);
  assert.match(explainOpenAIError(404, undefined, undefined, "OPENAI_TRANSCRIBE_MODEL"), /Remove OPENAI_TRANSCRIBE_MODEL/);
  assert.match(explainOpenAIError(400, "unsupported_parameter", "language"), /setting: language/);
  const reason = await openAIErrorReason(
    Response.json(
      { error: { message: "Patient said: my chest hurts", code: "insufficient_quota", param: "patient said x" } },
      { status: 429 },
    ),
  );
  assert.match(reason, /no credit/);
  assert.doesNotMatch(reason, /chest|Patient/);
  const bad = await openAIErrorReason(Response.json({ error: { param: "<script>" } }, { status: 400 }));
  assert.doesNotMatch(bad, /script/);
});
