import "server-only";
import { ProviderError, transcribeWithOpenAI } from "@/lib/transcription/openai";

// Provider calls live here, never in UI components. Keys stay in server-only env vars.
export class TranscriptionError extends Error {}

const mockTranscript = `Clinician: Kia ora, what brings you in today?
Patient: I've had a dry cough for about a week. It's worse at night.
Clinician: Any fever, shortness of breath or chest pain?
Patient: A mild temperature the first two days, nothing since. No chest pain.
Clinician: Are you still taking your usual medications?
Patient: Just the cetirizine for hay fever.
Clinician: Your chest sounds clear and your temperature is normal today. This looks like a post-viral cough. Rest, fluids, and honey in warm water can help. Come back if it lasts beyond three weeks or you become short of breath.
Patient: Thanks, I will.`;

/**
 * Selected by TRANSCRIPTION_PROVIDER: `mock` (default, no account) or `openai`
 * (needs OPENAI_API_KEY and the owner's approval for the spend).
 */
export async function transcribe(audio: Blob): Promise<{ text: string }> {
  const provider = process.env.TRANSCRIPTION_PROVIDER || "mock";
  switch (provider) {
    case "mock":
      if (audio.size === 0) throw new TranscriptionError("The audio is empty.");
      return { text: mockTranscript };
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
