import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { finalise, saveReview } from "@/lib/data/notes";
import { getConsultation } from "@/lib/data/queries";
import { consultationPatchSchema, idSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(404, "Consultation not found.");
  return handleApi(async () => {
    const consultation = await getConsultation(auth.supabase, id.data);
    return consultation
      ? apiData(consultation)
      : apiError(404, "Consultation not found.");
  });
}

/** WS04: PATCH { finalNote?, status?: "reviewing" | "finalised" } -> Consultation. Same rules as the Server Actions. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(404, "Consultation not found.");
  const body = consultationPatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return apiError(400, body.error.issues[0]?.message ?? "The request is invalid.");
  const { finalNote, status } = body.data;
  if (status !== "finalised" && !finalNote)
    return apiError(400, "Send finalNote to save a review.");
  return handleApi(async () => {
    const result =
      status === "finalised"
        ? await finalise(auth.supabase, id.data, finalNote)
        : await saveReview(auth.supabase, id.data, finalNote);
    return result.ok ? apiData(result.consultation) : apiError(result.status, result.error);
  });
}
