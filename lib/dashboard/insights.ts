// Pure productivity metrics for the dashboard charts: note turnaround, team workload and
// an estimate of documentation time saved. No database or secrets, so it runs in tests.
import { dueBucket } from "@/lib/tasks/logic";
import { nzDay } from "@/lib/time";
import type { ConsultationStatus } from "@/types/consultation";
import type { Task } from "@/types/task";

/** Assumption behind the time-saved estimate, shown on the chart. Change it here. */
export const MINUTES_SAVED_PER_AI_NOTE = 7;

/** Statuses that mean an AI draft was produced for the consultation. */
const AI_DRAFTED: ConsultationStatus[] = ["draft_generated", "reviewing", "finalised"];

export interface InsightConsultation {
  status: ConsultationStatus;
  consultedAt: string;
  finalisedAt?: string;
}

export function median(values: number[]) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Hours from consultation to finalised note, per NZ day of the consultation. */
export function noteTurnaround(consultations: InsightConsultation[], days: string[]) {
  const hours = (c: InsightConsultation) => (Date.parse(c.finalisedAt!) - Date.parse(c.consultedAt)) / 3_600_000;
  const inRange = consultations.filter((c) => days.includes(nzDay(new Date(c.consultedAt))));
  const finalised = inRange.filter((c) => c.status === "finalised" && c.finalisedAt);
  return {
    perDay: days.map((day) => {
      const done = finalised.filter((c) => nzDay(new Date(c.consultedAt)) === day).map(hours);
      return { day, medianHours: median(done), count: done.length };
    }),
    medianHours: median(finalised.map(hours)),
    finalised: finalised.length,
    waiting: inRange.filter((c) => c.status !== "finalised").length,
  };
}

/** "25 min", "3.5 h", "2 days". */
export function formatHours(hours: number | undefined) {
  if (hours === undefined) return "–";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round(hours / 24)} days`;
}

export interface WorkloadRow {
  id: string | null;
  name: string;
  overdue: number;
  onTrack: number;
  total: number;
}

/** Open tasks per clinician (and unassigned), split into overdue and on track, busiest first. */
export function teamWorkload(
  openTasks: Pick<Task, "status" | "dueAt" | "assignedTo">[],
  clinicians: { id: string; name: string }[],
  now = new Date(),
  limit = 8,
): WorkloadRow[] {
  const rows = new Map<string | null, WorkloadRow>();
  for (const t of openTasks) {
    if (t.status !== "open") continue;
    const key = t.assignedTo ?? null;
    const row =
      rows.get(key) ??
      {
        id: key,
        name: key ? (clinicians.find((c) => c.id === key)?.name ?? "Former clinician") : "Unassigned",
        overdue: 0,
        onTrack: 0,
        total: 0,
      };
    if (dueBucket(t, now) === "overdue") row.overdue++;
    else row.onTrack++;
    row.total++;
    rows.set(key, row);
  }
  return [...rows.values()]
    .sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** AI-drafted notes per NZ day and the documentation time they are estimated to save. */
export function timeSaved(consultations: InsightConsultation[], days: string[], minutesPerNote = MINUTES_SAVED_PER_AI_NOTE) {
  const perDay = days.map((day) => {
    const notes = consultations.filter(
      (c) => AI_DRAFTED.includes(c.status) && nzDay(new Date(c.consultedAt)) === day,
    ).length;
    return { day, notes, hours: (notes * minutesPerNote) / 60 };
  });
  const notes = perDay.reduce((sum, d) => sum + d.notes, 0);
  return { perDay, notes, hours: (notes * minutesPerNote) / 60, minutesPerNote };
}
