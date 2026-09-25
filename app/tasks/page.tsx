import Link from "next/link";
import { TaskList } from "@/components/tasks/task-list";
import { requireClinician } from "@/lib/auth";
import { listClinicians, listTasks } from "@/lib/data/tasks";
import { taskViewSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks" };

const VIEWS = [
  { key: "mine", label: "My tasks", empty: "Nothing assigned to you. Tasks appear here when you finalise a note with follow-ups, or when a colleague assigns one to you." },
  { key: "open", label: "All open", empty: "No open tasks for anyone." },
  { key: "done", label: "Done", empty: "No completed tasks yet." },
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { supabase, userId } = await requireClinician();
  const view = taskViewSchema.parse((await searchParams).view);
  const [tasks, clinicians] = await Promise.all([
    listTasks(supabase, view, userId),
    listClinicians(supabase),
  ]);
  const current = VIEWS.find((v) => v.key === view)!;

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 py-10 lg:px-[30px]">
      <p className="text-body-2 mb-3 text-hippo-900/80">TASK MANAGER</p>
      <h1 className="text-h2 text-hippo-900">Tasks</h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-charcoal">
        Follow-ups from finalised notes and tasks added by the team. Overdue work is always at the top.
      </p>

      <nav aria-label="Task views" className="mt-8 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/tasks?view=${v.key}`}
            aria-current={v.key === view ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              v.key === view ? "bg-hippo-600 text-white" : "bg-white text-hippo-900 ring-1 ring-hippo-200 hover:bg-hippo-100"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <TaskList tasks={tasks} clinicians={clinicians} empty={current.empty} />
      </div>
      <p className="mt-8 text-sm text-charcoal">
        To add a task, open the patient and use <strong>Add a task</strong>.
      </p>
    </main>
  );
}
