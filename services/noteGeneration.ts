import "server-only";
import {
  NOTE_SYSTEM_PROMPT,
  NOTE_TOOL_NAME,
  NoteGenerationError,
  buildNotePrompt,
  mockClinicalNote,
  noteInputSchema,
  parseModelNote,
  type NoteContext,
} from "@/lib/notes/generation";
import type { ClinicalNote } from "@/types/consultation";

export { NoteGenerationError, type NoteContext };

// `mock` is the default until the owner approves paid API spend (see AGENTS.md).
export type NoteProvider = "mock" | "anthropic";

export function noteProvider(): NoteProvider {
  return process.env.NOTE_PROVIDER === "anthropic" ? "anthropic" : "mock";
}

export async function generateNote(
  transcript: string,
  context: NoteContext,
): Promise<ClinicalNote> {
  if (!transcript.trim()) throw new NoteGenerationError("The transcript is empty.");
  if (noteProvider() === "mock") return mockClinicalNote(transcript, context);
  return generateWithClaude(transcript, context);
}

async function generateWithClaude(transcript: string, context: NoteContext) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    throw new NoteGenerationError("NOTE_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set.");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
  let response;
  try {
    response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 4000,
      system: NOTE_SYSTEM_PROMPT,
      tools: [
        {
          name: NOTE_TOOL_NAME,
          description: "Record the structured draft clinical note for clinician review.",
          input_schema: noteInputSchema(),
        },
      ],
      tool_choice: { type: "tool", name: NOTE_TOOL_NAME },
      messages: [{ role: "user", content: buildNotePrompt(transcript, context) }],
    });
  } catch {
    // Provider details can include request data, so they are not surfaced.
    throw new NoteGenerationError("The note service is unavailable. Try again shortly.");
  }
  const call = response.content.find((block) => block.type === "tool_use");
  if (!call) throw new NoteGenerationError("The AI did not return a note.");
  return parseModelNote(call.input);
}
