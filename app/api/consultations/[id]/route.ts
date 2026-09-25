import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { getConsultation } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
