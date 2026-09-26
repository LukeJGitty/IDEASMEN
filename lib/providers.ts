// Which AI providers are switched on. Pure and secret-free so it can be tested and shown
// in the UI. Values are forgiving: " OpenAI ", "'openai'" and "openai" all mean openai.

export const MOCK_TRANSCRIPT = `Clinician: Kia ora, what brings you in today?
Patient: I've had a dry cough for about a week. It's worse at night.
Clinician: Any fever, shortness of breath or chest pain?
Patient: A mild temperature the first two days, nothing since. No chest pain.
Clinician: Are you still taking your usual medications?
Patient: Just the cetirizine for hay fever.
Clinician: Your chest sounds clear and your temperature is normal today. This looks like a post-viral cough. Rest, fluids, and honey in warm water can help. Come back if it lasts beyond three weeks or you become short of breath.
Patient: Thanks, I will.`;

/** Trims spaces, surrounding quotes and a trailing comment, and lower-cases. */
export function normaliseProvider(value: string | undefined) {
  return (value ?? "")
    .replace(/\s#.*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
    .toLowerCase();
}

export function transcriptionProviderFrom(value: string | undefined): "mock" | "openai" | string {
  const v = normaliseProvider(value);
  return v === "" ? "mock" : v;
}

export function noteProviderFrom(value: string | undefined): "mock" | "openai" | "anthropic" {
  const v = normaliseProvider(value);
  return v === "openai" || v === "anthropic" ? v : "mock";
}

/** True when a stored transcript is the offline sample, not a real recording. */
export const isSampleTranscript = (text: string) => text.trim() === MOCK_TRANSCRIPT.trim();
