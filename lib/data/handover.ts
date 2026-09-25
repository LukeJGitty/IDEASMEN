import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { toConsultation } from "@/lib/data/mappers";
import { QueryError, getPatientRecord } from "@/lib/data/queries";
import { toTask } from "@/lib/data/tasks";
import { buildHandoverItem, orderHandover } from "@/lib/handover/build";

type Client = SupabaseClient<Database>;
const MAX_PATIENTS = 40;

/**
 * Patients seen (or whose consultation changed) in the last `hours`, plus anyone with an
 * open task that is overdue or due within the next day.
 */
export async function loadHandover(supabase: Client, hours: number, now = new Date()) {
  const since = new Date(now.getTime() - hours * 3_600_000).toISOString();
  const soon = new Date(now.getTime() + 24 * 3_600_000).toISOString();
  // Two simple filters instead of an `or=` string, so timestamps need no PostgREST quoting.
  const [seen, changed, tasks] = await Promise.all([
    supabase.from("consultations").select("*").gte("consulted_at", since).limit(200),
    supabase.from("consultations").select("*").gte("updated_at", since).limit(200),
    supabase.from("tasks").select("*").eq("status", "open").limit(500),
  ]);
  if (seen.error || changed.error || tasks.error) throw new QueryError("Could not load the handover.");
  const byId = new Map([...seen.data, ...changed.data].map((row) => [row.id, row]));
  const recent = [...byId.values()].map(toConsultation);
  const openTasks = tasks.data.map(toTask);

  const patientIds = new Set(recent.map((c) => c.patientId));
  for (const t of openTasks) if (t.dueAt && t.dueAt <= soon) patientIds.add(t.patientId);

  const ids = [...patientIds].slice(0, MAX_PATIENTS);
  const records = await Promise.all(ids.map((id) => getPatientRecord(supabase, id)));
  const items = records.flatMap((record) =>
    record
      ? [
          buildHandoverItem(
            {
              ...record,
              consultations: recent.filter((c) => c.patientId === record.patient.id),
              tasks: openTasks.filter((t) => t.patientId === record.patient.id),
            },
            now,
          ),
        ]
      : [],
  );
  return { items: orderHandover(items), truncated: patientIds.size > MAX_PATIENTS, since };
}
