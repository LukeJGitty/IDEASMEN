import "server-only";
import {
  LETTER_SYSTEM_PROMPT,
  LetterError,
  buildLetterPrompt,
  cleanLetterBody,
  letterBodyWithOpenAI,
  mockLetterBody,
  type LetterInput,
} from "@/lib/referrals/letter";
import { noteProvider } from "@/services/noteGeneration";

export { LetterError };

/** Drafts the body of a referral letter with the same provider as clinical notes. */
export async function draftLetterBody(input: LetterInput): Promise<string> {
  const provider = noteProvider();
  if (provider === "mock") return mockLetterBody(input);
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new LetterError("NOTE_PROVIDER is openai but OPENAI_API_KEY is not set.");
    return letterBodyWithOpenAI(input, { apiKey, model: process.env.OPENAI_NOTE_MODEL });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new LetterError("NOTE_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set.");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 1500,
      system: LETTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildLetterPrompt(input) }],
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    return cleanLetterBody(text);
  } catch (error) {
    if (error instanceof LetterError) throw error;
    throw new LetterError("The letter service is unavailable. Try again shortly.");
  }
}
