import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { generateDraft } from "@/lib/data/notes";
import { generateNoteRequestSchema } from "@/lib/validation";

/** POST { consultationId } -> Consultation. The stored transcript is used, never one from the client. */
export async function POST(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const body = generateNoteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "Send a valid consultationId.");
  return handleApi(async () => {
    const result = await generateDraft(auth.supabase, body.data.consultationId);
    return result.ok ? apiData(result.consultation) : apiError(result.status, result.error);
  });
}
