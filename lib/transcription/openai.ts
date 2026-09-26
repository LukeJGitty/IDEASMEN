// OpenAI speech-to-text, kept free of secrets and `server-only` so it can be unit-tested
// with a fake fetch. services/transcription.ts supplies the key and chooses the provider.
import { audioExtension, baseMimeType } from "@/lib/validation";

export class ProviderError extends Error {}

export const DEFAULT_OPENAI_TRANSCRIBE_MODEL = "gpt-transcribe";

// Nudges spelling of clinical and NZ terms. The prompt is guidance, not text to insert.
const VOCABULARY_HINT =
  "A New Zealand GP consultation between a clinician and a patient. " +
  "Clinical terms, medication names and doses (mg, mcg, BD, TDS, PRN), and te reo Māori greetings such as kia ora may appear.";

export async function transcribeWithOpenAI(
  audio: Blob,
  options: {
    apiKey: string;
    model?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<{ text: string }> {
  if (audio.size === 0) throw new ProviderError("The audio is empty.");
  const type = baseMimeType(audio.type || "audio/webm");
  const extension = audioExtension(type) ?? "webm";

  const body = new FormData();
  // The API infers the format from the file name, so it must carry the right extension.
  body.append("file", new File([audio], `consultation.${extension}`, { type }));
  body.append("model", options.model || DEFAULT_OPENAI_TRANSCRIBE_MODEL);
  body.append("language", "en");
  body.append("prompt", VOCABULARY_HINT);
  body.append("response_format", "json");

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}` },
        body,
        signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
      },
    );
  } catch {
    throw new ProviderError("The transcription service could not be reached.");
  }
  // Provider error bodies can echo request details, so only the status is surfaced.
  if (!response.ok)
    throw new ProviderError(`The transcription service returned ${response.status}.`);

  const json: unknown = await response.json().catch(() => null);
  const text =
    json && typeof json === "object" && "text" in json && typeof json.text === "string"
      ? json.text.trim()
      : "";
  if (!text) throw new ProviderError("No speech was recognised in the recording.");
  return { text };
}
