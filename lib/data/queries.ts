import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { idSchema, isNhi, normaliseNhi } from "@/lib/validation";
import {
  toCondition,
  toConsultation,
  toMedication,
  toPatient,
} from "@/lib/data/mappers";

// Pass the client from requireClinician()/authenticateClinician() so RLS applies.
type Client = SupabaseClient<Database>;

export class QueryError extends Error {}

function check<T>(result: { data: T | null; error: unknown }, what: string) {
  if (result.error) throw new QueryError(`Could not load ${what}.`);
  return result.data;
}

/** `query` must already be validated by patientSearchSchema. */
export async function searchPatients(supabase: Client, query: string) {
  let request = supabase.from("patients").select("*");
  if (idSchema.safeParse(query).success) request = request.eq("id", query);
  else if (isNhi(query)) request = request.eq("nhi", normaliseNhi(query));
  else
    for (const term of query.split(/\s+/).filter(Boolean))
      request = request.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%`,
      );
  const rows = check(
    await request.order("last_name").order("first_name").limit(25),
    "patients",
  );
  return (rows ?? []).map(toPatient);
}

export async function getPatientRecord(supabase: Client, id: string) {
  const [patient, medications, conditions] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("medications")
      .select("*")
      .eq("patient_id", id)
      .order("status")
      .order("name"),
    supabase
      .from("medical_conditions")
      .select("*")
      .eq("patient_id", id)
      .order("status")
      .order("condition"),
  ]);
  const row = check(patient, "the patient");
  if (!row) return null;
  return {
    patient: toPatient(row),
    medications: (check(medications, "medications") ?? []).map(toMedication),
    conditions: (check(conditions, "medical history") ?? []).map(toCondition),
  };
}

export async function listConsultations(supabase: Client, patientId: string) {
  const rows = check(
    await supabase
      .from("consultations")
      .select("*")
      .eq("patient_id", patientId)
      .order("consulted_at", { ascending: false }),
    "consultations",
  );
  return (rows ?? []).map(toConsultation);
}

export async function getConsultation(supabase: Client, id: string) {
  const row = check(
    await supabase.from("consultations").select("*").eq("id", id).maybeSingle(),
    "the consultation",
  );
  return row ? toConsultation(row) : null;
}
