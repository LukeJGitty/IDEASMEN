import "server-only";
// WS04 write path, shared by the API routes and the Server Actions so both
// enforce exactly the same rules. The database guard is still the final authority.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { toConsultation } from "@/lib/data/mappers";
import { getConsultation, getPatientRecord } from "@/lib/data/queries";
import { clinicalNoteSchema } from "@/lib/validation";
import { NoteGenerationError, generateNote } from "@/services/noteGeneration";
import type { ClinicalNote, Consultation } from "@/types/consultation";

type Client = SupabaseClient<Database>;

export type NoteResult =
  | { ok: true; consultation: Consultation }
  | { ok: false; status: 400 | 404 | 409 | 500 | 502; error: string };

const fail = (status: 400 | 404 | 409 | 500 | 502, error: string): NoteResult => ({
  ok: false,
  status,
  error,
});

const NOT_FOUND = "Consultation not found.";
const LOCKED = "This consultation is finalised and read-only.";

// check_violation from guard_consultation_update, e.g. a race with another clinician.
const isGuardError = (error: { code?: string } | null) => error?.code === "23514";

async function update(
  supabase: Client,
  id: string,
  values: Database["public"]["Tables"]["consultations"]["Update"],
  conflict: string,
  onlyWithoutDraft = false,
): Promise<NoteResult> {
  let query = supabase.from("consultations").update(values).eq("id", id);
  if (onlyWithoutDraft) query = query.is("generated_draft", null);
  const { data, error } = await query.select("*").maybeSingle();
  if (isGuardError(error)) return fail(409, conflict);
  if (error) return fail(500, "Could not save the note. Try again.");
  if (!data) return fail(409, conflict);
  return { ok: true, consultation: toConsultation(data) };
}

/** Task 2: reads the stored transcript (never a client-supplied one) and writes the draft once. */
export async function generateDraft(supabase: Client, id: string): Promise<NoteResult> {
  const consultation = await getConsultation(supabase, id);
  if (!consultation) return fail(404, NOT_FOUND);
  if (consultation.status === "finalised") return fail(409, LOCKED);
  if (consultation.generatedDraft) return fail(409, "An AI draft already exists for this consultation.");
  if (!consultation.transcript?.trim())
    return fail(409, "There is no transcript yet. Record and transcribe the consultation first.");

  const record = await getPatientRecord(supabase, consultation.patientId);
  let draft: ClinicalNote;
  try {
    draft = await generateNote(consultation.transcript, {
      medications: record?.medications ?? [],
      conditions: record?.conditions ?? [],
    });
  } catch (error) {
    if (error instanceof NoteGenerationError) return fail(502, error.message);
    throw error;
  }
  return update(
    supabase,
    id,
    { generated_draft: draft as unknown as Json, status: "draft_generated" },
    "An AI draft already exists for this consultation.",
    true,
  );
}

async function loadEditable(supabase: Client, id: string) {
  const consultation = await getConsultation(supabase, id);
  if (!consultation) return fail(404, NOT_FOUND);
  if (consultation.status === "finalised") return fail(409, LOCKED);
  if (!consultation.generatedDraft)
    return fail(409, "Generate the AI draft before reviewing the note.");
  return { ok: true as const, consultation };
}

/** Task 3: the clinician's edits become final_note; the AI draft is never touched. */
export async function saveReview(supabase: Client, id: string, note: unknown): Promise<NoteResult> {
  const parsed = clinicalNoteSchema.safeParse(note);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "The note is invalid.");
  const current = await loadEditable(supabase, id);
  if (!current.ok) return current;
  return update(
    supabase,
    id,
    { final_note: parsed.data as unknown as Json, status: "reviewing" },
    LOCKED,
  );
}

/** Task 4: one update writes the note and finalises; the database stamps who and when. */
export async function finalise(supabase: Client, id: string, note: unknown): Promise<NoteResult> {
  const current = await loadEditable(supabase, id);
  if (!current.ok) return current;
  const parsed = clinicalNoteSchema.safeParse(note ?? current.consultation.finalNote);
  if (!parsed.success)
    return fail(400, note === undefined ? "Save a reviewed note before finalising." : parsed.error.issues[0]?.message ?? "The note is invalid.");
  return update(
    supabase,
    id,
    { final_note: parsed.data as unknown as Json, status: "finalised" },
    LOCKED,
  );
}

/** Display name for the finaliser; clinicians can read each other's profiles under RLS. */
export async function getClinicianName(supabase: Client, userId?: string) {
  if (!userId) return undefined;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name?.trim() || undefined;
}
