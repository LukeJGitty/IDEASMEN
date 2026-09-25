import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { QueryError } from "@/lib/data/queries";
import { sortTasks, type TaskSuggestion } from "@/lib/tasks/logic";
import type { Task } from "@/types/task";

type Client = SupabaseClient<Database>;
const opt = <T>(value: T | null) => value ?? undefined;

export function toTask(row: Tables<"tasks">): Task {
  return {
    id: row.id,
    patientId: row.patient_id,
    consultationId: opt(row.consultation_id),
    title: row.title,
    details: opt(row.details),
    dueAt: opt(row.due_at),
    status: row.status === "done" ? "done" : "open",
    source: row.source === "note" ? "note" : "manual",
    assignedTo: opt(row.assigned_to),
    createdBy: opt(row.created_by),
    createdAt: row.created_at,
    completedBy: opt(row.completed_by),
    completedAt: opt(row.completed_at),
  };
}

export type TaskWithPatient = Task & { patientName: string };

type Joined = Tables<"tasks"> & { patients: { first_name: string; last_name: string } | null };
const withPatient = (row: Joined): TaskWithPatient => ({
  ...toTask(row),
  patientName: row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : "Unknown patient",
});

/** `mine` = my open tasks, `open` = everyone's open tasks, `done` = recently completed. */
export async function listTasks(supabase: Client, view: "mine" | "open" | "done", userId: string) {
  let query = supabase.from("tasks").select("*, patients(first_name, last_name)");
  if (view === "done")
    query = query.eq("status", "done").order("completed_at", { ascending: false }).limit(50);
  else {
    query = query.eq("status", "open").limit(200);
    if (view === "mine") query = query.eq("assigned_to", userId);
  }
  const { data, error } = await query;
  if (error) throw new QueryError("Could not load tasks.");
  const rows = (data as unknown as Joined[]).map(withPatient);
  return view === "done" ? rows : sortTasks(rows);
}

export async function listPatientTasks(supabase: Client, patientId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new QueryError("Could not load tasks.");
  return sortTasks((data ?? []).map(toTask));
}

export async function countMyOpenTasks(supabase: Client, userId: string) {
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .eq("assigned_to", userId);
  return count ?? 0;
}

export interface Clinician {
  id: string;
  name: string;
}

/** Clinicians who can be assigned tasks. RLS lets clinicians read each other's profiles. */
export async function listClinicians(supabase: Client): Promise<Clinician[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_clinician", true)
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name.trim() || "Unnamed clinician" }));
}

export async function createTask(
  supabase: Client,
  task: {
    patientId: string;
    consultationId?: string;
    title: string;
    details?: string;
    dueAt?: string;
    assignedTo?: string;
    source?: "manual" | "note";
  },
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      patient_id: task.patientId,
      consultation_id: task.consultationId ?? null,
      title: task.title,
      details: task.details || null,
      due_at: task.dueAt ?? null,
      assigned_to: task.assignedTo ?? null,
      source: task.source ?? "manual",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return toTask(data);
}

/** Tasks the clinician confirmed when finalising a note, assigned to them by default. */
export async function createTasksFromNote(
  supabase: Client,
  consultation: { id: string; patientId: string },
  suggestions: TaskSuggestion[],
  assignedTo: string,
) {
  if (suggestions.length === 0) return 0;
  const { data, error } = await supabase
    .from("tasks")
    .insert(
      suggestions.map((s) => ({
        patient_id: consultation.patientId,
        consultation_id: consultation.id,
        title: s.title,
        due_at: s.dueAt ?? null,
        assigned_to: assignedTo,
        source: "note",
      })),
    )
    .select("id");
  return error ? 0 : (data?.length ?? 0);
}

export async function updateTask(
  supabase: Client,
  id: string,
  changes: { status?: "open" | "done"; assignedTo?: string | null; title?: string; dueAt?: string | null },
) {
  const values: Database["public"]["Tables"]["tasks"]["Update"] = {};
  if (changes.status !== undefined) values.status = changes.status;
  if (changes.assignedTo !== undefined) values.assigned_to = changes.assignedTo;
  if (changes.title !== undefined) values.title = changes.title;
  if (changes.dueAt !== undefined) values.due_at = changes.dueAt;
  const { data, error } = await supabase.from("tasks").update(values).eq("id", id).select("*").maybeSingle();
  if (error || !data) return null;
  return toTask(data);
}
