import { ROLE_LABEL } from "@/lib/roster/logic";
import { formatNzTime } from "@/lib/time";
import type { RosterShift } from "@/types/roster";

/** Compact "who's on right now" strip, used on the roster and handover pages. */
export function OnShiftNow({ shifts }: { shifts: RosterShift[] }) {
  return (
    <section aria-labelledby="on-now" className="rounded-[20px] border border-hippo-200 bg-white p-5">
      <h2 id="on-now" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900">
        <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" /> On shift now
      </h2>
      {shifts.length === 0 ? (
        <p className="mt-3 text-sm text-charcoal">Nobody is rostered right now.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {shifts.map((s) => (
            <li key={s.id} className="rounded-full bg-hippo-100 px-3 py-1.5 text-sm text-hippo-900">
              <span className="font-medium">{s.staffName}</span>{" "}
              <span className="text-hippo-900/70">
                {ROLE_LABEL[s.role]}, {s.area}, until {formatNzTime(s.endsAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
