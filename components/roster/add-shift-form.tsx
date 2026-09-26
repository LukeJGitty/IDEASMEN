"use client";
import { useActionState } from "react";
import { addShiftAction, type ShiftFormState } from "@/app/roster/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

export function AddShiftForm({ days }: { days: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ShiftFormState, FormData>(addShiftAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-[20px] border border-hippo-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-6">
      <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-6">Add a shift</h2>
      <div className="lg:col-span-2">
        <label htmlFor="shift-name" className="text-sm font-medium">Staff member</label>
        <input id="shift-name" name="staffName" required maxLength={80} placeholder="e.g. Hana Kim" className={`${fieldClass} mt-2`} disabled={pending} />
      </div>
      <div>
        <label htmlFor="shift-role" className="text-sm font-medium">Role</label>
        <select id="shift-role" name="role" defaultValue="nurse" className={`${fieldClass} mt-2`} disabled={pending}>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="reception">Reception</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="shift-area" className="text-sm font-medium">Area</label>
        <input id="shift-area" name="area" required defaultValue="Clinic" maxLength={60} className={`${fieldClass} mt-2`} disabled={pending} />
      </div>
      <div className="lg:col-span-2">
        <label htmlFor="shift-date" className="text-sm font-medium">Day</label>
        <select id="shift-date" name="date" className={`${fieldClass} mt-2`} disabled={pending}>
          {days.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="shift-start" className="text-sm font-medium">Start</label>
        <input id="shift-start" name="start" type="time" required defaultValue="08:00" className={`${fieldClass} mt-2`} disabled={pending} />
      </div>
      <div>
        <label htmlFor="shift-end" className="text-sm font-medium">End</label>
        <input id="shift-end" name="end" type="time" required defaultValue="16:30" className={`${fieldClass} mt-2`} disabled={pending} />
      </div>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add shift"}</Button>
        <p aria-live="polite" role={state.error ? "alert" : "status"} className="text-sm">
          {state.error || state.success}
        </p>
      </div>
    </form>
  );
}
