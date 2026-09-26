import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import {
  NEEDS_REVIEW,
  consultationsPerDay,
  dashboardCounts,
  followUpsThisWeek,
  pastNzDays,
  resultsToChase,
  reviewQueue,
  todaysTeam,
  type DashboardConsultation,
} from "@/lib/dashboard/summary";
import { getClinicianName } from "@/lib/data/notes";
import { QueryError } from "@/lib/data/queries";
import { listShifts } from "@/lib/data/roster";
import { listClinicians, listTasks, toTask } from "@/lib/data/tasks";
import { nzLocalToIso } from "@/lib/time";
import type { ConsultationStatus } from "@/types/consultation";

type Client = SupabaseClient<Database>;
type Row = Pick<Tables<"consultations">, "id" | "patient_id" | "doctor_id" | "status" | "consulted_at"> & {
  patients: { first_name: string; last_name: string } | null;
};

const COLUMNS = "id, patient_id, doctor_id, status, consulted_at, patients(first_name, last_name)";

const toDashboardConsultation = (row: Row): DashboardConsultation => ({
  id: row.id,
  patientId: row.patient_id,
  patientName: row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : "Unknown patient",
  doctorId: row.doctor_id,
  status: row.status as ConsultationStatus,
  consultedAt: row.consulted_at,
});

/** Everything the shift dashboard shows, loaded in parallel. RLS applies to every query. */
export async function loadDashboard(supabase: Client, userId: string, now = new Date()) {
  const days = pastNzDays(7, now);
  const weekStart = nzLocalToIso(days[0], "00:00");
  const todayStart = nzLocalToIso(days[days.length - 1], "00:00");

  const [myTasks, openTasks, done, recent, waiting, shifts, name, clinicians] = await Promise.all([
    listTasks(supabase, "mine", userId),
    listTasks(supabase, "open", userId),
    supabase.from("tasks").select("*").eq("status", "done").gte("completed_at", todayStart).limit(1000),
    supabase.from("consultations").select(COLUMNS).gte("consulted_at", weekStart).limit(1000),
    supabase.from("consultations").select(COLUMNS).in("status", NEEDS_REVIEW).order("consulted_at").limit(50),
    listShifts(supabase, new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 86_400_000)),
    getClinicianName(supabase, userId),
    listClinicians(supabase),
  ]);
  if (done.error || recent.error || waiting.error)
    throw new QueryError("Could not load the dashboard.");

  const byId = new Map(
    [...(recent.data as unknown as Row[]), ...(waiting.data as unknown as Row[])].map((row) => [
      row.id,
      toDashboardConsultation(row),
    ]),
  );
  const consultations = [...byId.values()];
  const todayDay = days[days.length - 1];

  return {
    name,
    counts: dashboardCounts({ userId, openTasks, doneTasks: done.data.map(toTask), consultations, now }),
    myTasks: myTasks.slice(0, 8),
    myTaskTotal: myTasks.length,
    review: reviewQueue(consultations, userId).slice(0, 6),
    seenToday: consultations
      .filter((c) => Date.parse(c.consultedAt) >= Date.parse(todayStart))
      .sort((a, b) => b.consultedAt.localeCompare(a.consultedAt))
      .slice(0, 8),
    week: consultationsPerDay(consultations, days),
    today: todayDay,
    team: todaysTeam(shifts, todayStart, now),
    results: resultsToChase(openTasks).slice(0, 8),
    resultsTotal: resultsToChase(openTasks).length,
    followUps: followUpsThisWeek(openTasks, now).slice(0, 8),
    clinicians,
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
