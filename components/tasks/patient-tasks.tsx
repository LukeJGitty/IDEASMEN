import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskList } from "@/components/tasks/task-list";
import type { Clinician } from "@/lib/data/tasks";
import type { Task } from "@/types/task";

export function PatientTasks({
  patientId,
  tasks,
  clinicians,
  currentUserId,
}: {
  patientId: string;
  tasks: Task[];
  clinicians: Clinician[];
  currentUserId: string;
}) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done").slice(0, 5);
  return (
    <section aria-labelledby="patient-tasks" className="rounded-[20px] border border-hippo-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="patient-tasks" className="text-lg font-semibold">
          Tasks
        </h2>
        <span className="rounded-full bg-hippo-100 px-3 py-1 text-xs font-medium text-hippo-900">
          {open.length} open
        </span>
      </div>
      <TaskList
        tasks={[...open, ...done]}
        clinicians={clinicians}
        showPatient={false}
        empty="No tasks for this patient yet."
      />
      <div className="mt-5">
        <AddTaskForm patientId={patientId} clinicians={clinicians} currentUserId={currentUserId} />
      </div>
    </section>
  );
}
