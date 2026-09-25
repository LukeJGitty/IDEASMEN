import { authenticateClinician } from "@/lib/auth";
import { apiData, apiError } from "@/lib/api";
import { updateTask } from "@/lib/data/tasks";
import { idSchema, taskUpdateSchema } from "@/lib/validation";

/** PATCH { status?, assignedTo?, title?, dueAt? } -> Task. The database stamps who completed it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateClinician();
  if (!auth.ok) return apiError(auth.status);
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return apiError(404, "Task not found.");
  const body = taskUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, body.error.issues[0]?.message ?? "The request is invalid.");
  const task = await updateTask(auth.supabase, id.data, body.data);
  return task ? apiData(task) : apiError(404, "Task not found.");
}
