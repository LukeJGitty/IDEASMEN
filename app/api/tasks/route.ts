import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError, handleApi } from "@/lib/api";
import { createTask, listTasks } from "@/lib/data/tasks";
import { nzDateToDue } from "@/lib/tasks/logic";
import { taskCreateSchema, taskViewSchema } from "@/lib/validation";

/** GET /api/tasks?view=mine|open|done -> Task[] (with patientName), overdue first. */
export async function GET(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const view = taskViewSchema.parse(new URL(request.url).searchParams.get("view") ?? undefined);
  return handleApi(async () => apiData(await listTasks(auth.supabase, view, auth.userId)));
}

/** POST { patientId, title, consultationId?, dueDate? | dueAt?, assignedTo? } -> Task */
export async function POST(request: Request) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const body = taskCreateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, body.error.issues[0]?.message ?? "The task is invalid.");
  const { dueDate, dueAt, ...rest } = body.data;
  const task = await createTask(auth.supabase, {
    ...rest,
    dueAt: dueAt ?? (dueDate ? nzDateToDue(dueDate) : undefined),
  });
  return task ? apiData(task, 201) : apiError(400, "Could not create the task. Check the patient exists.");
}
