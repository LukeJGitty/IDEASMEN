// Pure task logic: suggesting follow-up tasks from a finalised note, NZ due dates and
// grouping. No database or secrets here, so it runs in tests and in the browser.
import type { ClinicalNote } from "@/types/consultation";
import type { Task } from "@/types/task";

export const TIME_ZONE = "Pacific/Auckland";

export interface TaskSuggestion {
  title: string;
  dueAt?: string; // ISO timestamp
}

// Things a clinician has to do or chase, as opposed to advice for the patient.
const ACTION =
  /\b(bloods?|blood tests?|tests?|x-?rays?|scans?|ultrasound|ecg|swabs?|cultures?|urine|refer\w*|review\w*|follow[- ]?up|recall|book\w*|order\w*|repeat|chase|phone|call|check\w*|come back|see (?:you|them|her|him) again|appointment|results?)\b/i;

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14,
};
const UNIT_HOURS: Record<string, number> = { hour: 1, day: 24, week: 24 * 7, month: 24 * 30 };

/** Hours from now implied by the sentence ("in 2 days", "one week", "tomorrow"), if any. */
export function dueInHours(sentence: string): number | undefined {
  const s = sentence.toLowerCase();
  const m = s.match(
    /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen)\s+(hour|day|week|month)s?\b/,
  );
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
    if (n && n <= 365) return n * UNIT_HOURS[m[2]];
  }
  if (/\btomorrow\b/.test(s)) return 24;
  if (/\bnext week\b/.test(s)) return 24 * 7;
  if (/\b(today|this (morning|afternoon|evening)|asap|urgent\w*)\b/.test(s)) return 4;
  return undefined;
}

const sentencesOf = (text: string) =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/^(plan|follow[- ]?up)\s*:\s*/i, ""))
    .filter((s) => s.length > 2);

/** Follow-up tasks implied by the plan and follow-up sections of a note. */
export function suggestTasks(note: Pick<ClinicalNote, "plan" | "followUp">, now = new Date()): TaskSuggestion[] {
  const seen = new Set<string>();
  const out: TaskSuggestion[] = [];
  for (const sentence of [...sentencesOf(note.plan), ...sentencesOf(note.followUp)]) {
    if (!ACTION.test(sentence)) continue;
    const title = (sentence[0].toUpperCase() + sentence.slice(1)).slice(0, 200);
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hours = dueInHours(sentence);
    out.push({
      title,
      dueAt: hours === undefined ? undefined : new Date(now.getTime() + hours * 3_600_000).toISOString(),
    });
  }
  return out.slice(0, 20);
}

/** Offset of `zone` from UTC, in ms, at the given instant. */
function zoneOffsetMs(instant: number, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "2026-09-30" -> that date at 17:00 New Zealand time, as an ISO timestamp (handles NZST/NZDT). */
export function nzDateToDue(date: string, hour = 17): string {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  const first = guess - zoneOffsetMs(guess, TIME_ZONE);
  return new Date(guess - zoneOffsetMs(first, TIME_ZONE)).toISOString();
}

const nzDay = (instant: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(instant); // YYYY-MM-DD

export type DueBucket = "overdue" | "today" | "upcoming" | "someday" | "done";

export function dueBucket(task: Pick<Task, "status" | "dueAt">, now = new Date()): DueBucket {
  if (task.status === "done") return "done";
  if (!task.dueAt) return "someday";
  const due = new Date(task.dueAt);
  if (due < now) return "overdue";
  return nzDay(due) === nzDay(now) ? "today" : "upcoming";
}

export const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "upcoming", "someday", "done"];
export const BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Coming up",
  someday: "No due date",
  done: "Done",
};

/** Overdue first, then by due time; tasks without a due date last. */
export function sortTasks<T extends Pick<Task, "status" | "dueAt" | "createdAt">>(tasks: T[], now = new Date()) {
  return [...tasks].sort((a, b) => {
    const rank = BUCKET_ORDER.indexOf(dueBucket(a, now)) - BUCKET_ORDER.indexOf(dueBucket(b, now));
    if (rank) return rank;
    return (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt);
  });
}

export function formatDue(iso: string, now = new Date()) {
  const due = new Date(iso);
  const mins = Math.round((due.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(mins);
  const span =
    abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  const when = new Intl.DateTimeFormat("en-NZ", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(due);
  return mins < 0 ? `${when} (${span} overdue)` : `${when} (in ${span})`;
}
