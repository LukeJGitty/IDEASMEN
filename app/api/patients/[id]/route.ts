import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { getPatientRecord } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(404, "Patient not found.");
  return handleApi(async () => {
    const record = await getPatientRecord(auth.supabase, id.data);
    return record ? apiData(record) : apiError(404, "Patient not found.");
  });
}
