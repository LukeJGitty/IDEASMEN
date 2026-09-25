"use client";
import { useActionState } from "react";
import { createTaskAction, type TaskFormState } from "@/app/tasks/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import type { Clinician } from "@/lib/data/tasks";

export function AddTaskForm({
  patientId,
  clinicians,
  currentUserId,
}: {
  patientId: string;
  clinicians: Clinician[];
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState<TaskFormState, FormData>(createTaskAction, {});
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-hippo-100 p-4">
      <input type="hidden" name="patientId" value={patientId} />
      <div>
        <label htmlFor="task-title" className="text-sm font-medium">
          Add a task
        </label>
        <input
          id="task-title"
          name="title"
          required
          maxLength={200}
          placeholder="e.g. Chase blood results, phone patient"
          className={`${fieldClass} mt-2`}
          disabled={pending}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="task-due" className="text-sm font-medium">
            Due date <span className="font-normal text-charcoal">(optional)</span>
          </label>
          <input id="task-due" name="dueDate" type="date" className={`${fieldClass} mt-2`} disabled={pending} />
        </div>
        <div>
          <label htmlFor="task-assignee" className="text-sm font-medium">
            Assign to
          </label>
          <select
            id="task-assignee"
            name="assignedTo"
            defaultValue={currentUserId}
            className={`${fieldClass} mt-2`}
            disabled={pending}
          >
            <option value="">Unassigned</option>
            {clinicians.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.id === currentUserId ? " (you)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add task"}
      </Button>
      <p aria-live="polite" role={state.error ? "alert" : "status"} className="text-sm">
        {state.error || state.success}
      </p>
    </form>
  );
}
