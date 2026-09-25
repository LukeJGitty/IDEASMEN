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
