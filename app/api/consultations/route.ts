import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { consultationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  try {
    const body = await request.json();
    const parsed = consultationSchema.safeParse(body);
    if (!parsed.success) return apiError(400, parsed.error.issues[0].message);
    return handleApi(async () => {
      const { data, error } = await auth.supabase
        .from("consultations")
        .insert({ patient_id: parsed.data.patientId })
        .select("*")
        .single();
      if (error || !data) return apiError(500, "Could not create consultation.");
      return apiData({
        id: data.id,
        patientId: data.patient_id,
        doctorId: data.doctor_id,
        date: data.consulted_at,
        status: data.status,
        audioPath: data.audio_path ?? undefined,
        transcript: data.transcript ?? undefined,
        generatedDraft: data.generated_draft ?? undefined,
        finalNote: data.final_note ?? undefined,
        finalisedBy: data.finalised_by ?? undefined,
        finalisedAt: data.finalised_at ?? undefined,
      });
    });
  } catch {
    return apiError(400, "The request body must be valid JSON.");
  }
}
