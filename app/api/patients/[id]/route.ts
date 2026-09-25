import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { getPatientRecord } from "@/lib/data/queries";
import { idSchema, patientSchema } from "@/lib/validation";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(404, "Patient not found.");
  try {
    const body = await request.json();
    const parsed = patientSchema.partial().safeParse(body);
    if (!parsed.success) return apiError(400, parsed.error.issues[0].message);
    return handleApi(async () => {
      const { data, error } = await auth.supabase
        .from("patients")
        .update({
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          date_of_birth: parsed.data.dateOfBirth,
          email: parsed.data.email,
          phone: parsed.data.phone,
        })
        .eq("id", id.data)
        .select("*")
        .single();
      if (error || !data) return apiError(404, "Patient not found.");
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
