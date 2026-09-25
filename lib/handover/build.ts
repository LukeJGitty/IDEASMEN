// Pure SBAR handover builder: turns a patient's record, recent consultations and open
// tasks into a short handover. Deterministic and traceable: every line comes from a
// stored note or task, nothing is generated.
import { dueBucket, formatDue, sortTasks } from "@/lib/tasks/logic";
import type { Consultation } from "@/types/consultation";
import type { Medication } from "@/types/medication";
import type { MedicalCondition, Patient } from "@/types/patient";
import type { Task } from "@/types/task";

export interface HandoverInput {
  patient: Patient;
  conditions: MedicalCondition[];
  medications: Medication[];
  consultations: Consultation[]; // in the handover window, any order
  tasks: Task[]; // open tasks
}

export interface HandoverItem {
  patientId: string;
  name: string;
  age?: number;
  latestConsultationId?: string;
  situation: string;
  background: string;
  assessment: string;
  recommendations: string[];
  flags: string[];
}

const STATUS_TEXT: Record<string, string> = {
  recording: "consultation started, not yet recorded",
  uploading: "recording uploading",
  transcribing: "recorded and transcribed, note not drafted",
  draft_generated: "AI draft ready, not reviewed",
  reviewing: "note in review, not finalised",
  finalised: "note finalised",
};

export function ageOn(dateOfBirth: string, now: Date) {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 0 && age < 130 ? age : undefined;
}

const clip = (text: string, max = 220) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function buildHandoverItem(input: HandoverInput, now = new Date()): HandoverItem {
  const { patient, conditions, medications, tasks } = input;
  const consultations = [...input.consultations].sort((a, b) => b.date.localeCompare(a.date));
  const latest = consultations[0];
  const note = latest?.finalNote ?? latest?.generatedDraft;
  const flags: string[] = [];
  const recommendations: string[] = [];

  const unfinalised = consultations.filter((c) => c.status !== "finalised" && (c.transcript || c.generatedDraft));
  if (unfinalised.length)
    flags.push(`${unfinalised.length} note${unfinalised.length === 1 ? "" : "s"} not finalised`);

  const openTasks = sortTasks(tasks.filter((t) => t.status === "open"), now);
  const overdue = openTasks.filter((t) => dueBucket(t, now) === "overdue");
  if (overdue.length) flags.push(`${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`);

  let situation: string;
  if (latest) {
    const when = new Intl.DateTimeFormat("en-NZ", {
      timeZone: "Pacific/Auckland",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(latest.date));
    situation = `Seen ${when}${note?.reasonForVisit ? ` for ${clip(note.reasonForVisit.replace(/\.$/, ""), 160).toLowerCase()}` : ""}. Status: ${STATUS_TEXT[latest.status] ?? latest.status}.`;
    if (consultations.length > 1) situation += ` ${consultations.length} consultations in this period.`;
  } else {
    situation = "No consultation in this period; on the list for open tasks.";
  }

  const activeConditions = conditions.filter((c) => c.status === "active").map((c) => c.condition);
  const activeMeds = medications
    .filter((m) => m.status === "active")
    .map((m) => [m.name, m.dose].filter(Boolean).join(" "));
  const background =
    [
      activeConditions.length ? `Conditions: ${activeConditions.join(", ")}.` : "",
      activeMeds.length ? `Medications: ${activeMeds.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ") || "No active conditions or medications recorded.";

  const assessmentParts = [note?.assessment, note?.observations].filter(Boolean) as string[];
  let assessment = assessmentParts.length ? clip(assessmentParts.join(" "), 320) : "No assessment recorded yet.";
  if (latest && !latest.finalNote && latest.generatedDraft) assessment = `AI draft (not reviewed): ${assessment}`;

  if (unfinalised.length) recommendations.push("Review and finalise the outstanding note before acting on it.");
  for (const task of openTasks.slice(0, 5))
    recommendations.push(
      `${task.title.replace(/\.$/, "")}${task.dueAt ? `: due ${formatDue(task.dueAt, now)}` : ""}`,
    );
  if (openTasks.length > 5) recommendations.push(`${openTasks.length - 5} more open tasks on the Tasks page.`);
  if (!openTasks.length && note?.followUp) recommendations.push(clip(note.followUp, 200));
  if (!recommendations.length) recommendations.push("Nothing outstanding.");

  return {
    patientId: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    age: ageOn(patient.dateOfBirth, now),
    latestConsultationId: latest?.id,
    situation,
    background,
    assessment,
    recommendations,
    flags,
  };
}

/** Patients needing attention (flags) first, then alphabetical. */
export function orderHandover(items: HandoverItem[]) {
  return [...items].sort((a, b) => b.flags.length - a.flags.length || a.name.localeCompare(b.name));
}
