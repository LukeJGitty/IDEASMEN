import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { getConsultation } from "@/lib/data/queries";
import { toConsultation } from "@/lib/data/mappers";
import { audioExtension, baseMimeType, transcribeSchema } from "@/lib/validation";
import { TranscriptionError, transcribe } from "@/services/transcription";

const bucket = "consultation-audio";
// AI transcription and note drafting can take a while; allow up to 2 minutes on Vercel.
export const maxDuration = 120;

const retryMessage =
  "Transcription failed. The recording is saved, so you can retry without recording again.";

/**
 * Stores the recording once, then writes the raw transcript once. A retry after a
 * provider failure transcribes the stored audio; any newly uploaded audio is ignored.
 */
export async function POST(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const { supabase } = auth;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "Send the recording as multipart form data.");
  }
  const input = transcribeSchema.safeParse({
    consultationId: form.get("consultationId"),
    audio: form.get("audio") ?? undefined,
  });
  if (!input.success) return apiError(400, input.error.issues[0].message);
  const { consultationId, audio } = input.data;

  return handleApi(async () => {
    const consultation = await getConsultation(supabase, consultationId);
    if (!consultation) return apiError(404, "Consultation not found.");
    if (consultation.status === "finalised")
      return apiError(409, "This consultation is finalised.");
    if (consultation.transcript)
      return apiError(409, "This consultation already has a transcript.");

    let recording: Blob;
    if (consultation.audioPath) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(consultation.audioPath);
      if (error) return apiError(500, "Could not load the saved recording.");
      recording = data;
    } else {
      if (!audio) return apiError(400, "Attach an audio recording.");
      const type = baseMimeType(audio.type);
      const path = `${consultationId}/${Date.now()}.${audioExtension(type)}`;
      const upload = await supabase.storage
        .from(bucket)
        .upload(path, audio, { contentType: type });
      if (upload.error) return apiError(500, "Could not save the recording.");
      const saved = await supabase
        .from("consultations")
        .update({ audio_path: path, status: "transcribing" })
        .eq("id", consultationId)
        .is("audio_path", null)
        .select("id");
      if (saved.error) return apiError(500, "Could not save the recording.");
      if (!saved.data.length)
        return apiError(409, "A recording was already saved for this consultation.");
      recording = audio;
    }

    let text: string;
    try {
      text = (await transcribe(recording)).text.trim();
    } catch (error) {
      // TranscriptionError messages are written for people and never contain the key,
      // the audio or the provider's error text, so they are safe to show and log.
      const reason = error instanceof TranscriptionError ? error.message : "";
      console.error(`[transcribe] ${reason || "unexpected error"}`);
      return apiError(502, reason ? `${retryMessage} Reason: ${reason}` : retryMessage);
    }
    if (!text) return apiError(502, retryMessage);

    const { data, error } = await supabase
      .from("consultations")
      .update({ transcript: text })
      .eq("id", consultationId)
      .is("transcript", null)
      .select()
      .maybeSingle();
    // 23514: the database guard refused the write (e.g. finalised meanwhile).
    if (error?.code === "23514")
      return apiError(409, "This consultation can no longer be changed.");
    if (error) return apiError(500, "Could not save the transcript.");
    if (!data)
      return apiError(409, "This consultation already has a transcript.");
    return apiData(toConsultation(data));
  });
}
