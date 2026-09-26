import "server-only";
import { MOCK_TRANSCRIPT, transcriptionProviderFrom } from "@/lib/providers";
import { ProviderError, transcribeWithOpenAI } from "@/lib/transcription/openai";

// Provider calls live here, never in UI components. Keys stay in server-only env vars.
export class TranscriptionError extends Error {}

/**
 * Selected by TRANSCRIPTION_PROVIDER: `mock` (default, no account) or `openai`
 * (needs OPENAI_API_KEY and the owner's approval for the spend).
 */
export async function transcribe(audio: Blob): Promise<{ text: string }> {
  const provider = transcriptionProviderFrom(process.env.TRANSCRIPTION_PROVIDER);
  switch (provider) {
    case "mock":
      if (audio.size === 0) throw new TranscriptionError("The audio is empty.");
      return { text: MOCK_TRANSCRIPT };
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey)
        throw new TranscriptionError("TRANSCRIPTION_PROVIDER is openai but OPENAI_API_KEY is not set.");
      try {
        return await transcribeWithOpenAI(audio, {
          apiKey,
          model: process.env.OPENAI_TRANSCRIBE_MODEL,
        });
      } catch (error) {
        if (error instanceof ProviderError) throw new TranscriptionError(error.message);
        throw error;
      }
    }
    default:
      throw new TranscriptionError(
        `Unknown transcription provider "${provider}".`,
      );
  }
}
