"use server";
import { revalidatePath } from "next/cache";
import { requireClinician } from "@/lib/auth";
import { createTask, updateTask } from "@/lib/data/tasks";
import { nzDateToDue } from "@/lib/tasks/logic";
import { idSchema, taskCreateSchema, taskUpdateSchema } from "@/lib/validation";

export type TaskFormState = { error?: string; success?: string };

function refresh(patientId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/handover");
  if (patientId) revalidatePath(`/patients/${patientId}`);
  revalidatePath("/", "layout"); // header task count
}

export async function createTaskAction(_: TaskFormState, form: FormData): Promise<TaskFormState> {
  const { supabase } = await requireClinician();
  const parsed = taskCreateSchema.safeParse({
    patientId: form.get("patientId"),
    title: form.get("title") ?? "",
    dueDate: form.get("dueDate"),
    assignedTo: form.get("assignedTo"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the task details." };
  const { patientId, title, dueDate, assignedTo } = parsed.data;
  const task = await createTask(supabase, {
    patientId,
    title,
    dueAt: dueDate ? nzDateToDue(dueDate) : undefined,
    assignedTo,
  });
  if (!task) return { error: "Couldn’t add the task. Try again." };
  refresh(patientId);
  return { success: "Task added." };
}

/** Plain form actions for the task list buttons: done, reopen and reassign. */
export async function updateTaskAction(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse(form.get("taskId"));
  if (!id.success) return;
  const assigned = form.get("assignedTo");
  const parsed = taskUpdateSchema.safeParse({
    status: form.get("status") ?? undefined,
    assignedTo: assigned === null ? undefined : assigned === "" ? null : assigned,
  });
  if (!parsed.success) return;
  const task = await updateTask(supabase, id.data, parsed.data);
  refresh(task?.patientId);
}
