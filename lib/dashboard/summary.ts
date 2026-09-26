// Pure shift-dashboard logic: headline counts, the week's activity and the review queue.
// No database or secrets here, so it runs in tests.
import { dueBucket } from "@/lib/tasks/logic";
import { TIME_ZONE, nzDay } from "@/lib/time";
import type { ConsultationStatus } from "@/types/consultation";
import type { Task } from "@/types/task";

export interface DashboardConsultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  status: ConsultationStatus;
  consultedAt: string;
}

/** Statuses where a clinician still has to act before the note is finished. */
export const NEEDS_REVIEW: ConsultationStatus[] = ["transcribing", "draft_generated", "reviewing"];

export const REVIEW_LABEL: Partial<Record<ConsultationStatus, string>> = {
  transcribing: "Transcript ready, draft the note",
  draft_generated: "AI draft ready to review",
  reviewing: "In review, not finalised",
};

/** The last `count` New Zealand calendar days, oldest first, ending today. */
export function pastNzDays(count: number, now = new Date()) {
  const days: string[] = [];
  for (let i = 0; days.length < count && i < count + 2; i++) {
    const day = nzDay(new Date(now.getTime() - i * 86_400_000));
    if (!days.includes(day)) days.push(day);
  }
  return days.reverse();
}

/** "Mon", "Tue"… for a YYYY-MM-DD New Zealand date. */
export const shortWeekday = (day: string) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", weekday: "short" }).format(new Date(`${day}T12:00:00Z`));

/** Consultations per NZ day for the given days (oldest first). */
export function consultationsPerDay(consultations: Pick<DashboardConsultation, "consultedAt">[], days: string[]) {
  const counts = new Map(days.map((d) => [d, 0]));
  for (const c of consultations) {
    const day = nzDay(new Date(c.consultedAt));
    if (counts.has(day)) counts.set(day, counts.get(day)! + 1);
  }
  return days.map((day) => ({ day, count: counts.get(day)! }));
}

export interface DashboardCounts {
  myOverdue: number;
  myDueToday: number;
  myOpen: number;
  teamOverdue: number;
  unassigned: number;
  toReview: number;
  myToReview: number;
  seenToday: number;
  doneToday: number;
}

export function dashboardCounts(input: {
  userId: string;
  openTasks: Pick<Task, "status" | "dueAt" | "assignedTo">[];
  doneTasks: Pick<Task, "completedAt">[];
  consultations: DashboardConsultation[];
  now?: Date;
}): DashboardCounts {
  const now = input.now ?? new Date();
  const today = nzDay(now);
  const mine = input.openTasks.filter((t) => t.assignedTo === input.userId);
  const review = input.consultations.filter((c) => NEEDS_REVIEW.includes(c.status));
  return {
    myOverdue: mine.filter((t) => dueBucket(t, now) === "overdue").length,
    myDueToday: mine.filter((t) => dueBucket(t, now) === "today").length,
    myOpen: mine.length,
    teamOverdue: input.openTasks.filter((t) => dueBucket(t, now) === "overdue").length,
    unassigned: input.openTasks.filter((t) => !t.assignedTo).length,
    toReview: review.length,
    myToReview: review.filter((c) => c.doctorId === input.userId).length,
    seenToday: new Set(
      input.consultations.filter((c) => nzDay(new Date(c.consultedAt)) === today).map((c) => c.patientId),
    ).size,
    doneToday: input.doneTasks.filter((t) => t.completedAt && nzDay(new Date(t.completedAt)) === today).length,
  };
}

/** Notes waiting on a clinician: mine first, then oldest first (longest waiting). */
export function reviewQueue(consultations: DashboardConsultation[], userId: string) {
  return consultations
    .filter((c) => NEEDS_REVIEW.includes(c.status))
    .sort(
      (a, b) =>
        Number(b.doctorId === userId) - Number(a.doctorId === userId) || a.consultedAt.localeCompare(b.consultedAt),
    );
}

/** "Good morning" etc. by New Zealand local hour. */
export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-NZ", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Doctor workflow panels: investigations to chase, follow-ups due, today's team.

/** Tasks about tests, imaging or results that someone has to chase. */
const RESULT =
  /\b(bloods?|blood tests?|tests?|hba1c|fbc|lfts?|u ?& ?es?|crp|inr|x-?rays?|cxr|scans?|ct|mri|ultrasound|ecg|echo|swabs?|cultures?|urine|msu|biopsy|histology|results?|pathology|labs?|imaging)\b/i;

export const isResultTask = (title: string) => RESULT.test(title);

/** Open investigation tasks for the whole team, most urgent first (input is already sorted). */
export function resultsToChase<T extends Pick<Task, "status" | "title">>(tasks: T[]) {
  return tasks.filter((t) => t.status === "open" && isResultTask(t.title));
}

export interface FollowUpPatient<T> {
  patientId: string;
  patientName: string;
  next: T;
  count: number;
  overdue: boolean;
}

/**
 * Patients with a non-investigation task due in the next 7 days (or already overdue),
 * one row per patient, soonest first.
 */
export function followUpsThisWeek<T extends Pick<Task, "status" | "title" | "dueAt" | "patientId"> & { patientName: string }>(
  tasks: T[],
  now = new Date(),
): FollowUpPatient<T>[] {
  const horizon = now.getTime() + 7 * 86_400_000;
  const due = tasks
    .filter((t) => t.status === "open" && t.dueAt && Date.parse(t.dueAt) <= horizon && !isResultTask(t.title))
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  const byPatient = new Map<string, FollowUpPatient<T>>();
  for (const task of due) {
    const row = byPatient.get(task.patientId);
    if (row) row.count++;
    else
      byPatient.set(task.patientId, {
        patientId: task.patientId,
        patientName: task.patientName,
        next: task,
        count: 1,
        overdue: Date.parse(task.dueAt!) < now.getTime(),
      });
  }
  return [...byPatient.values()];
}

export interface TeamShift {
  id: string;
  staffName: string;
  role: "doctor" | "nurse" | "reception" | "other";
  area: string;
  startsAt: string;
  endsAt: string;
}

/**
 * Everyone working at any point today (New Zealand day), grouped doctors, nurses, then
 * everyone else, with whether they are on right now. Also flags a day with no doctor
 * or no nurse rostered.
 */
export function todaysTeam<S extends TeamShift>(shifts: S[], dayStartIso: string, now = new Date()) {
  const start = Date.parse(dayStartIso);
  const end = start + 24 * 3_600_000;
  const t = now.getTime();
  const today = shifts
    .filter((s) => Date.parse(s.startsAt) < end && Date.parse(s.endsAt) > start)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.staffName.localeCompare(b.staffName))
    .map((s) => ({
      ...s,
      onNow: Date.parse(s.startsAt) <= t && t < Date.parse(s.endsAt),
      finished: Date.parse(s.endsAt) <= t,
    }));
  const group = (roles: TeamShift["role"][]) => today.filter((s) => roles.includes(s.role));
  const gaps = today.length
    ? (["doctor", "nurse"] as const)
        .filter((role) => !today.some((s) => s.role === role))
        .map((role) => `No ${role} rostered today`)
    : [];
  return {
    doctors: group(["doctor"]),
    nurses: group(["nurse"]),
    others: group(["reception", "other"]),
    onNowCount: today.filter((s) => s.onNow).length,
    gaps,
  };
}
