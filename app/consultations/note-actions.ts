"use server";
import { revalidatePath } from "next/cache";
import { requireClinician } from "@/lib/auth";
import { finalise, generateDraft, saveReview, type NoteResult } from "@/lib/data/notes";
import { noteFromForm } from "@/lib/notes/form";
import { idSchema } from "@/lib/validation";

export type NoteFormState = { error?: string; success?: string };

async function run(
  form: FormData,
  action: (
    supabase: Awaited<ReturnType<typeof requireClinician>>["supabase"],
    id: string,
  ) => Promise<NoteResult>,
  success: string,
): Promise<NoteFormState> {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse(form.get("consultationId"));
  if (!id.success) return { error: "This consultation could not be found." };
  let result: NoteResult;
  try {
    result = await action(supabase, id.data);
  } catch {
    return { error: "Something went wrong. Try again." };
  }
  if (!result.ok) return { error: result.error };
  revalidatePath(`/consultations/${id.data}`, "layout");
  revalidatePath(`/patients/${result.consultation.patientId}`);
  return { success };
}

export async function generateDraftAction(_: NoteFormState, form: FormData) {
  return run(form, generateDraft, "AI draft generated. Review every field before finalising.");
}

export async function saveNoteAction(_: NoteFormState, form: FormData) {
  return run(form, (supabase, id) => saveReview(supabase, id, noteFromForm(form)), "Review saved.");
}

/** WS04 task 4. Requires the explicit confirmation from the editor, checked again here. */
export async function finaliseConsultation(_: NoteFormState, form: FormData) {
  if (form.get("confirmReviewed") !== "on")
    return { error: "Confirm you have reviewed the note before finalising." };
  return run(form, (supabase, id) => finalise(supabase, id, noteFromForm(form)), "Note finalised.");
}
