import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { searchPatients } from "@/lib/data/queries";
import { patientSearchSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const q = patientSearchSchema.safeParse(
    new URL(request.url).searchParams.get("q") ?? "",
  );
  if (!q.success) return apiError(400, q.error.issues[0].message);
  return handleApi(async () => apiData(await searchPatients(auth.supabase, q.data)));
}
