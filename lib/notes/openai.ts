// OpenAI clinical-note provider, free of secrets and `server-only` so it can be unit-tested
// with a fake fetch. Uses Chat Completions with a strict JSON schema, then re-validates the
// result against clinicalNoteSchema exactly like the Claude provider does.
import { openAIErrorReason } from "@/lib/openai-errors";
import {
  NOTE_SYSTEM_PROMPT,
  NoteGenerationError,
  buildNotePrompt,
  parseModelNote,
  type NoteContext,
} from "@/lib/notes/generation";

export const DEFAULT_OPENAI_NOTE_MODEL = "gpt-6-luna";

const text = { type: "string" } as const;
// Strict structured outputs need every field required and no extra keys; empty strings
// stand for "not mentioned", which the system prompt asks for.
export const OPENAI_NOTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "reasonForVisit",
    "history",
    "relevantMedicalHistory",
    "currentMedications",
    "observations",
    "assessment",
    "plan",
    "followUp",
  ],
  properties: {
    reasonForVisit: text,
    history: text,
    relevantMedicalHistory: text,
    currentMedications: { type: "array", items: text },
    observations: text,
    assessment: text,
    plan: text,
    followUp: text,
  },
} as const;

export async function generateNoteWithOpenAI(
  transcript: string,
  context: NoteContext,
  options: { apiKey: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number },
) {
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model || DEFAULT_OPENAI_NOTE_MODEL,
        messages: [
          { role: "system", content: NOTE_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildNotePrompt(transcript, context, "Return the draft note as JSON matching the schema."),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "clinical_note", schema: OPENAI_NOTE_SCHEMA, strict: true },
        },
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
    });
  } catch {
    throw new NoteGenerationError("The note service is unavailable. Try again shortly.");
  }
  // Error bodies can echo request content, so only the status is surfaced.
  if (!response.ok) throw new NoteGenerationError(await openAIErrorReason(response, "OPENAI_NOTE_MODEL"));
  const json = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null; refusal?: string | null } }[];
  } | null;
  const message = json?.choices?.[0]?.message;
  if (!message?.content || message.refusal) throw new NoteGenerationError("The AI did not return a note.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    throw new NoteGenerationError("The AI returned a note in an unexpected format.");
  }
  return parseModelNote(parsed);
}
