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
import { generateNoteWithOpenAI } from "@/lib/notes/openai";
import { noteProviderFrom } from "@/lib/providers";
import type { ClinicalNote } from "@/types/consultation";

export { NoteGenerationError, type NoteContext };

// `mock` is the default until the owner approves paid API spend (see AGENTS.md).
export type NoteProvider = "mock" | "anthropic" | "openai";

export function noteProvider(): NoteProvider {
  return noteProviderFrom(process.env.NOTE_PROVIDER);
}

export async function generateNote(
  transcript: string,
  context: NoteContext,
): Promise<ClinicalNote> {
  if (!transcript.trim()) throw new NoteGenerationError("The transcript is empty.");
  const provider = noteProvider();
  if (provider === "mock") return mockClinicalNote(transcript, context);
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      throw new NoteGenerationError("NOTE_PROVIDER is openai but OPENAI_API_KEY is not set.");
    return generateNoteWithOpenAI(transcript, context, { apiKey, model: process.env.OPENAI_NOTE_MODEL });
  }
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
