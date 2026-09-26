import Link from "next/link";
import { updateTaskAction } from "@/app/tasks/actions";
import { Button } from "@/components/ui/button";
import type { FollowUpPatient } from "@/lib/dashboard/summary";
import type { Clinician, TaskWithPatient } from "@/lib/data/tasks";
import { dueBucket, formatDue } from "@/lib/tasks/logic";

const card = "rounded-[20px] border border-hippo-200 bg-white p-5";
const title = "text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900";

/** Open tests, imaging and results for the whole team, so nothing pending gets lost. */
export function ResultsToChase({
  tasks,
  total,
  clinicians,
  now,
}: {
  tasks: TaskWithPatient[];
  total: number;
  clinicians: Clinician[];
  now: Date;
}) {
  return (
    <section aria-labelledby="results" className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="results" className={title}>
          Results to chase
        </h2>
        {total > tasks.length && (
          <Link href="/tasks?view=open" className="text-sm text-hippo-600 hover:underline">
            See all {total}
          </Link>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-charcoal">No tests or results outstanding.</p>
      ) : (
        <ul className="mt-3 divide-y divide-hippo-100">
          {tasks.map((task) => {
            const bucket = dueBucket(task, now);
            const owner = clinicians.find((c) => c.id === task.assignedTo)?.name ?? "Unassigned";
            return (
              <li key={task.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{task.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
                    <Link href={`/patients/${task.patientId}`} className="text-hippo-600 hover:underline">
                      {task.patientName}
                    </Link>
                    <span className="text-charcoal/80">{owner}</span>
                    <span className={bucket === "overdue" ? "font-medium text-red-700" : "text-charcoal/80"}>
                      {bucket === "overdue" && "Overdue · "}
                      {task.dueAt ? formatDue(task.dueAt, now) : "No due date"}
                    </span>
                  </p>
                </div>
                <form action={updateTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <Button type="submit" size="sm" variant="outline" name="status" value="done">
                    Done
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** One row per patient with a follow-up, review or call due within a week. */
export function FollowUpsThisWeek({ rows, now }: { rows: FollowUpPatient<TaskWithPatient>[]; now: Date }) {
  return (
    <section aria-labelledby="follow-ups" className={card}>
      <h2 id="follow-ups" className={title}>
        Follow-ups due this week
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-charcoal">No follow-ups due in the next 7 days.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {rows.map((row) => (
            <li key={row.patientId}>
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/patients/${row.patientId}`} className="font-medium text-hippo-900 hover:underline">
                  {row.patientName}
                </Link>
                <span className={`shrink-0 ${row.overdue ? "font-medium text-red-700" : "text-charcoal/80"}`}>
                  {row.overdue ? "Overdue" : formatDue(row.next.dueAt!, now).replace(/ \(.*\)$/, "")}
                </span>
              </div>
              <p className="mt-0.5 text-charcoal/80">
                {row.next.title}
                {row.count > 1 && ` (+${row.count - 1} more)`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
