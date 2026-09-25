import "server-only";

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

/** Selected by TRANSCRIPTION_PROVIDER. Only `mock` exists until the owner approves a paid provider. */
export async function transcribe(audio: Blob): Promise<{ text: string }> {
  const provider = process.env.TRANSCRIPTION_PROVIDER || "mock";
  switch (provider) {
    case "mock":
      if (audio.size === 0) throw new TranscriptionError("The audio is empty.");
      return { text: mockTranscript };
    default:
      throw new TranscriptionError(
        `Unknown transcription provider "${provider}".`,
      );
  }
}
