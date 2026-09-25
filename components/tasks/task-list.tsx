import Link from "next/link";
import { updateTaskAction } from "@/app/tasks/actions";
import { Button } from "@/components/ui/button";
import type { Clinician } from "@/lib/data/tasks";
import { BUCKET_LABEL, BUCKET_ORDER, dueBucket, formatDue, type DueBucket } from "@/lib/tasks/logic";
import type { Task } from "@/types/task";

type Row = Task & { patientName?: string };

const bucketStyle: Record<DueBucket, string> = {
  overdue: "border-red-200 bg-red-50/60",
  today: "border-amber-200 bg-amber-50/60",
  upcoming: "border-hippo-200 bg-white",
  someday: "border-hippo-200 bg-white",
  done: "border-hippo-200 bg-white opacity-70",
};

const dueStyle: Record<DueBucket, string> = {
  overdue: "text-red-700 font-medium",
  today: "text-amber-800 font-medium",
  upcoming: "text-charcoal",
  someday: "text-charcoal/70",
  done: "text-charcoal/70",
};

function TaskRow({
  task,
  clinicians,
  showPatient,
}: {
  task: Row;
  clinicians: Clinician[];
  showPatient: boolean;
}) {
  const bucket = dueBucket(task);
  const assignee = clinicians.find((c) => c.id === task.assignedTo)?.name;
  return (
    <li className={`rounded-2xl border p-4 ${bucketStyle[bucket]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`break-words font-medium ${task.status === "done" ? "line-through" : ""}`}>
            {task.title}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {showPatient && (
              <Link href={`/patients/${task.patientId}`} className="text-hippo-600 underline-offset-4 hover:underline">
                {task.patientName}
              </Link>
            )}
            <span className={dueStyle[bucket]}>
              {task.status === "done"
                ? `Done${task.completedAt ? ` ${formatDue(task.completedAt).split(" (")[0]}` : ""}`
                : task.dueAt
                  ? `Due ${formatDue(task.dueAt)}`
                  : "No due date"}
            </span>
            {task.source === "note" && task.consultationId && (
              <Link
                href={`/consultations/${task.consultationId}`}
                className="rounded-full bg-hippo-100 px-2 py-0.5 text-xs text-hippo-900 hover:underline"
              >
                From note
              </Link>
            )}
          </p>
        </div>
        <form action={updateTaskAction}>
          <input type="hidden" name="taskId" value={task.id} />
          {task.status === "open" ? (
            <Button type="submit" size="sm" name="status" value="done">
              Mark done
            </Button>
          ) : (
            <Button type="submit" size="sm" variant="outline" name="status" value="open">
              Reopen
            </Button>
          )}
        </form>
      </div>
      {task.status === "open" && (
        <form action={updateTaskAction} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="taskId" value={task.id} />
          <label htmlFor={`assign-${task.id}`} className="text-charcoal">
            Assigned to
          </label>
          <select
            id={`assign-${task.id}`}
            name="assignedTo"
            defaultValue={task.assignedTo ?? ""}
            className="rounded-xl border border-hippo-200 bg-white px-3 py-1.5"
          >
            <option value="">Unassigned</option>
            {clinicians.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="ghost">
            Save
          </Button>
          {!assignee && task.assignedTo && <span className="text-xs text-charcoal/70">(former clinician)</span>}
        </form>
      )}
    </li>
  );
}

/** Tasks grouped into Overdue / Due today / Coming up / No due date / Done. */
export function TaskList({
  tasks,
  clinicians,
  showPatient = true,
  empty,
}: {
  tasks: Row[];
  clinicians: Clinician[];
  showPatient?: boolean;
  empty: string;
}) {
  if (tasks.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-hippo-300 px-5 py-8 text-sm text-charcoal">{empty}</p>
    );
  const groups = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: tasks.filter((t) => dueBucket(t) === bucket),
  })).filter((g) => g.items.length);
  return (
    <div className="space-y-6">
      {groups.map(({ bucket, items }) => (
        <section key={bucket} aria-labelledby={`bucket-${bucket}`}>
          <h3 id={`bucket-${bucket}`} className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900">
            {BUCKET_LABEL[bucket]} <span className="font-normal text-charcoal/70">({items.length})</span>
          </h3>
          <ul className="space-y-3">
            {items.map((task) => (
              <TaskRow key={task.id} task={task} clinicians={clinicians} showPatient={showPatient} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
