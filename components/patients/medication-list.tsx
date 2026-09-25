import { createMedication, stopMedication } from "@/app/patients/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import type { Medication } from "@/types/medication";

export function MedicationList({
  patientId,
  medications,
}: {
  patientId: string;
  medications: Medication[];
}) {
  const active = medications.filter((item) => item.status === "active");
  const stopped = medications.filter((item) => item.status === "stopped");

  return (
    <section className="rounded-[20px] border border-black/10 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Medications</h2>
        <span className="rounded-full bg-off-white px-2.5 py-1 text-xs font-medium text-charcoal">
          {active.length} active
        </span>
      </div>

      <form action={createMedication} className="mb-5 space-y-3 rounded-[20px] bg-off-white p-4">
        <input type="hidden" name="patientId" value={patientId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Medication" className={fieldClass} required />
          <input name="dose" placeholder="Dose" className={fieldClass} />
          <input name="frequency" placeholder="Frequency" className={fieldClass} />
          <input name="route" placeholder="Route" className={fieldClass} />
          <input type="date" name="startDate" className={fieldClass} />
          <input type="date" name="endDate" className={fieldClass} />
        </div>
        <textarea name="notes" rows={2} placeholder="Notes" className={`${fieldClass} resize-y`} />
        <Button type="submit">Add medication</Button>
      </form>

      <div className="space-y-3">
        {medications.length === 0 ? (
          <p className="text-sm text-charcoal">No medications recorded yet.</p>
        ) : (
          <>
            {active.map((medication) => (
              <div key={medication.id} className="rounded-xl border border-black/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{medication.name}</p>
                    <p className="text-sm text-charcoal">
                      {medication.dose || "Dose not specified"} · {medication.frequency || "Frequency not specified"}
                    </p>
                  </div>
                  <form action={stopMedication}>
                    <input type="hidden" name="id" value={medication.id} />
                    <input type="hidden" name="patientId" value={patientId} />
                    <Button type="submit" variant="outline" size="sm">Stop</Button>
                  </form>
                </div>
                {medication.notes ? <p className="mt-2 text-sm text-charcoal">{medication.notes}</p> : null}
              </div>
            ))}
            {stopped.length > 0 ? (
              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal">Stopped</p>
                {stopped.map((medication) => (
                  <div key={medication.id} className="rounded-xl border border-black/10 bg-off-white p-3 text-sm">
                    {medication.name} · {medication.status}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
