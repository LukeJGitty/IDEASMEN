import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { searchPatients } from "@/lib/data/queries";
import { patientSchema, patientSearchSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const q = patientSearchSchema.safeParse(
    new URL(request.url).searchParams.get("q") ?? "",
  );
  if (!q.success) return apiError(400, q.error.issues[0].message);
  return handleApi(async () => apiData(await searchPatients(auth.supabase, q.data)));
}

export async function POST(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  try {
    const body = await request.json();
    const parsed = patientSchema.safeParse(body);
    if (!parsed.success) return apiError(400, parsed.error.issues[0].message);
    return handleApi(async () => {
      const { data, error } = await auth.supabase
        .from("patients")
        .insert({
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          date_of_birth: parsed.data.dateOfBirth,
          email: parsed.data.email,
          phone: parsed.data.phone,
        })
        .select("*")
        .single();
      if (error || !data) return apiError(500, "Could not create patient.");
      return apiData({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        dateOfBirth: data.date_of_birth,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
      });
    });
  } catch {
    return apiError(400, "The request body must be valid JSON.");
  }
}
