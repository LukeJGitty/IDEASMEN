import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { listConsultations } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(404, "Patient not found.");
  return handleApi(async () =>
    apiData(await listConsultations(auth.supabase, id.data)),
  );
}
