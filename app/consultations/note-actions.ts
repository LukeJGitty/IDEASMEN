"use server";
import { revalidatePath } from "next/cache";
import { requireClinician } from "@/lib/auth";
import { finalise, generateDraft, saveReview, type NoteResult } from "@/lib/data/notes";
import { noteFromForm } from "@/lib/notes/form";
import { z } from "zod";
import { createTasksFromNote } from "@/lib/data/tasks";
import { idSchema, taskSuggestionSchema } from "@/lib/validation";

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

/**
 * WS04 task 4. Requires the explicit confirmation from the editor, checked again here.
 * Follow-up tasks the clinician kept ticked are created afterwards and assigned to them.
 */
export async function finaliseConsultation(_: NoteFormState, form: FormData) {
  if (form.get("confirmReviewed") !== "on")
    return { error: "Confirm you have reviewed the note before finalising." };
  const suggestions = z
    .array(taskSuggestionSchema)
    .max(20)
    .safeParse(
      form.getAll("suggestedTask").flatMap((value) => {
        try {
          return [JSON.parse(String(value))];
        } catch {
          return [];
        }
      }),
    );
  let created = 0;
  const state = await run(
    form,
    async (supabase, id) => {
      const result = await finalise(supabase, id, noteFromForm(form));
      if (result.ok && suggestions.success) {
        const { userId } = await requireClinician();
        created = await createTasksFromNote(supabase, result.consultation, suggestions.data, userId);
        revalidatePath("/tasks");
      }
      return result;
    },
    "Note finalised.",
  );
  if (state.success && created)
    state.success = `Note finalised. ${created} follow-up task${created === 1 ? "" : "s"} added to Tasks.`;
  return state;
}
