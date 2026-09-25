import { removeShiftAction } from "@/app/roster/actions";
import { AddShiftForm } from "@/components/roster/add-shift-form";
import { OnShiftNow } from "@/components/roster/on-shift-now";
import { Button } from "@/components/ui/button";
import { requireClinician } from "@/lib/auth";
import { listShifts } from "@/lib/data/roster";
import { ROLE_LABEL, coverageGaps, onShiftNow, shiftsByDay } from "@/lib/roster/logic";
import { formatNzDay, formatNzTime, nzDays } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roster" };

const roleBadge = {
  doctor: "bg-hippo-600 text-white",
  nurse: "bg-hippo-200 text-hippo-900",
  reception: "bg-off-white text-charcoal",
  other: "bg-off-white text-charcoal",
} as const;

export default async function RosterPage() {
  const { supabase } = await requireClinician();
  const now = new Date();
  const days = nzDays(7, now);
  const shifts = await listShifts(supabase, new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 8 * 86_400_000));
  const byDay = shiftsByDay(shifts, days);

  return (
    <main id="main" className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-[30px]">
      <div>
        <p className="text-body-2 mb-3 text-hippo-900/80">STAFF ROSTER</p>
        <h1 className="text-h2 text-hippo-900">Roster</h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-charcoal">
          Who is working this week. Days without a doctor or a nurse are flagged.
        </p>
      </div>

      <OnShiftNow shifts={onShiftNow(shifts, now)} />

      <section aria-label="Next 7 days" className="space-y-4">
        {days.map((day) => {
          const dayShifts = byDay.get(day) ?? [];
          const gaps = coverageGaps(dayShifts);
          return (
            <article key={day} className={`rounded-[20px] border bg-white p-5 ${gaps.length ? "border-amber-300" : "border-hippo-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-hippo-900">
                  {formatNzDay(day)}
                  {day === days[0] && <span className="ml-2 text-sm font-normal text-charcoal">Today</span>}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {dayShifts.length === 0 && <span className="text-sm text-charcoal/70">Closed / nobody rostered</span>}
                  {gaps.map((g) => (
                    <span key={g} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">{g}</span>
                  ))}
                </div>
              </div>
              {dayShifts.length > 0 && (
                <ul className="mt-3 divide-y divide-hippo-100">
                  {dayShifts.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadge[s.role]}`}>{ROLE_LABEL[s.role]}</span>
                        <span className="font-medium">{s.staffName}</span>
                        <span className="text-charcoal">{s.area}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums text-charcoal">
                          {formatNzTime(s.startsAt)} to {formatNzTime(s.endsAt)}
                        </span>
                        <form action={removeShiftAction}>
                          <input type="hidden" name="shiftId" value={s.id} />
                          <Button type="submit" size="sm" variant="ghost" aria-label={`Remove ${s.staffName}'s shift`}>
                            Remove
                          </Button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      <AddShiftForm days={days.map((d) => ({ value: d, label: formatNzDay(d) }))} />
    </main>
  );
}
