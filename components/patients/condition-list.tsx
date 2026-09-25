import { createCondition, resolveCondition } from "@/app/patients/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import type { MedicalCondition } from "@/types/patient";

export function ConditionList({
  patientId,
  conditions,
}: {
  patientId: string;
  conditions: MedicalCondition[];
}) {
  const active = conditions.filter((item) => item.status === "active");
  const resolved = conditions.filter((item) => item.status === "resolved");

  return (
    <section className="rounded-[20px] border border-black/10 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Medical history</h2>
        <span className="rounded-full bg-off-white px-2.5 py-1 text-xs font-medium text-charcoal">
          {active.length} active
        </span>
      </div>

      <form action={createCondition} className="mb-5 space-y-3 rounded-[20px] bg-off-white p-4">
        <input type="hidden" name="patientId" value={patientId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="condition" placeholder="Condition" className={fieldClass} required />
          <input type="date" name="diagnosedDate" className={fieldClass} />
        </div>
        <textarea name="notes" rows={2} placeholder="Notes" className={`${fieldClass} resize-y`} />
        <Button type="submit">Add condition</Button>
      </form>

      <div className="space-y-3">
        {conditions.length === 0 ? (
          <p className="text-sm text-charcoal">No conditions recorded yet.</p>
        ) : (
          <>
            {active.map((condition) => (
              <div key={condition.id} className="rounded-xl border border-black/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{condition.condition}</p>
                    {condition.diagnosedDate ? (
                      <p className="text-sm text-charcoal">Diagnosed {condition.diagnosedDate}</p>
                    ) : null}
                  </div>
                  <form action={resolveCondition}>
                    <input type="hidden" name="id" value={condition.id} />
                    <input type="hidden" name="patientId" value={patientId} />
                    <Button type="submit" variant="outline" size="sm">Resolve</Button>
                  </form>
                </div>
                {condition.notes ? <p className="mt-2 text-sm text-charcoal">{condition.notes}</p> : null}
              </div>
            ))}
            {resolved.length > 0 ? (
              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal">Resolved</p>
                {resolved.map((condition) => (
                  <div key={condition.id} className="rounded-xl border border-black/10 bg-off-white p-3 text-sm">
                    {condition.condition}
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
