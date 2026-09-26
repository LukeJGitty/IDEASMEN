import Link from "next/link";
import { formatNzTime } from "@/lib/time";
import type { todaysTeam } from "@/lib/dashboard/summary";

type Team = ReturnType<typeof todaysTeam>;
type Shift = Team["doctors"][number];

const title = "text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900";

function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <li className={`flex items-start justify-between gap-3 py-1.5 ${shift.finished ? "opacity-50" : ""}`}>
      <span className="min-w-0">
        <span className="font-medium">{shift.staffName}</span>{" "}
        <span className="text-charcoal/80">{shift.area}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-charcoal/80">
        {shift.onNow && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">On now</span>
        )}
        {formatNzTime(shift.startsAt)}–{formatNzTime(shift.endsAt)}
      </span>
    </li>
  );
}

function Group({ label, shifts, empty }: { label: string; shifts: Shift[]; empty: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/80">
        {label} <span className="font-normal">({shifts.length})</span>
      </h3>
      {shifts.length ? (
        <ul className="mt-1 text-sm">
          {shifts.map((s) => (
            <ShiftRow key={s.id} shift={s} />
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-charcoal/80">{empty}</p>
      )}
    </div>
  );
}

/** Doctors, nurses and support staff working today, with who is on right now. */
export function TeamToday({ team }: { team: Team }) {
  return (
    <section aria-labelledby="team-today" className="rounded-[20px] border border-hippo-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="team-today" className={`${title} flex items-center gap-2`}>
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" /> Today’s team
        </h2>
        <span className="text-xs text-charcoal/80">{team.onNowCount} on now</span>
      </div>
      {team.gaps.map((gap) => (
        <p key={gap} role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          ! {gap}
        </p>
      ))}
      <Group label="Doctors" shifts={team.doctors} empty="No doctor rostered today." />
      <Group label="Nurses" shifts={team.nurses} empty="No nurse rostered today." />
      {team.others.length > 0 && <Group label="Support" shifts={team.others} empty="" />}
      <Link href="/roster" className="mt-4 inline-block text-sm text-hippo-600 hover:underline">
        Full roster
      </Link>
    </section>
  );
}
