import { shortWeekday } from "@/lib/dashboard/summary";
import { formatHours, type WorkloadRow } from "@/lib/dashboard/insights";
import type { DashboardData } from "@/lib/data/dashboard";
import { formatNzDay } from "@/lib/time";

const card = "rounded-[20px] border border-hippo-200 bg-white p-5";
const title = "text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900";

interface Column {
  key: string;
  label: string;
  value: number | undefined;
  tooltip: string;
}

/** Small single-series column chart: one colour, one axis, hover for values, table for screen readers. */
function MiniColumns({ columns, caption, highlight }: { columns: Column[]; caption: string; highlight?: string }) {
  const max = Math.max(0, ...columns.map((c) => c.value ?? 0)) || 1;
  return (
    <figure className="mt-4">
      <div className="flex h-24 items-end gap-1.5 border-b border-hippo-200" aria-hidden="true">
        {columns.map((c) => {
          const pct = c.value ? Math.max(4, (c.value / max) * 100) : 0;
          return (
            <div key={c.key} className="group relative flex h-full flex-1 items-end justify-center">
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-lg bg-hippo-900 px-2 py-1 text-xs text-white shadow group-hover:block"
              >
                {c.tooltip}
              </span>
              <div
                className={`w-full max-w-5 rounded-t-[4px] ${c.key === highlight ? "bg-hippo-600" : "bg-hippo-300 group-hover:bg-hippo-400"}`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[11px] text-charcoal/80" aria-hidden="true">
        {columns.map((c) => (
          <span key={c.key} className={`flex-1 ${c.key === highlight ? "font-semibold text-hippo-900" : ""}`}>
            {c.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {columns.map((c) => (
            <tr key={c.key}>
              <td>{c.tooltip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Turnaround({ data, today }: { data: DashboardData["turnaround"]; today: string }) {
  return (
    <section aria-labelledby="turnaround" className={card}>
      <h2 id="turnaround" className={title}>
        Note turnaround
      </h2>
      <p className="mt-3 text-4xl font-semibold text-hippo-900">{formatHours(data.medianHours)}</p>
      <p className="mt-1 text-sm text-charcoal">
        median from consultation to finalised note, last 7 days
      </p>
      <p className="mt-1 text-xs text-charcoal/80">
        {data.finalised} finalised · {data.waiting} still open
      </p>
      <MiniColumns
        caption="Median hours to finalise, per day"
        highlight={today}
        columns={data.perDay.map((d) => ({
          key: d.day,
          label: d.day === today ? "Today" : shortWeekday(d.day),
          value: d.medianHours,
          tooltip: `${formatNzDay(d.day)}: ${d.count ? `${formatHours(d.medianHours)} median, ${d.count} note${d.count === 1 ? "" : "s"}` : "no notes finalised"}`,
        }))}
      />
    </section>
  );
}

function Workload({ rows }: { rows: WorkloadRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section aria-labelledby="workload" className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="workload" className={title}>
          Team workload
        </h2>
        <p className="flex items-center gap-3 text-xs text-charcoal">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-red-600" /> Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-hippo-600" /> On track
          </span>
        </p>
      </div>
      <p className="mt-1 text-sm text-charcoal">Open tasks per person</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal">No open tasks. Everyone’s caught up.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <li
              key={r.id ?? "unassigned"}
              className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 text-sm"
              title={`${r.name}: ${r.total} open, ${r.overdue} overdue`}
            >
              <span className="truncate text-charcoal">{r.name}</span>
              <span className="flex items-center gap-2">
                <span className="flex h-4 flex-1 items-stretch gap-[2px]" aria-hidden="true">
                  {r.overdue > 0 && (
                    <span
                      className={`bg-red-600 ${r.onTrack ? "rounded-l-[4px]" : "rounded-[4px]"}`}
                      style={{ width: `${(r.overdue / max) * 100}%` }}
                    />
                  )}
                  {r.onTrack > 0 && (
                    <span
                      className={`bg-hippo-600 ${r.overdue ? "rounded-r-[4px]" : "rounded-[4px]"}`}
                      style={{ width: `${(r.onTrack / max) * 100}%` }}
                    />
                  )}
                </span>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-charcoal">
                  {r.total}
                  {r.overdue > 0 && <span className="text-red-700"> ({r.overdue}!)</span>}
                </span>
              </span>
              <span className="sr-only">
                {r.total} open tasks, {r.overdue} overdue
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TimeSaved({ data, today }: { data: DashboardData["saved"]; today: string }) {
  return (
    <section aria-labelledby="time-saved" className={card}>
      <h2 id="time-saved" className={title}>
        Time saved (estimate)
      </h2>
      <p className="mt-3 text-4xl font-semibold text-hippo-900">{formatHours(data.hours)}</p>
      <p className="mt-1 text-sm text-charcoal">of note writing saved by AI drafts, last 7 days</p>
      <p className="mt-1 text-xs text-charcoal/80">
        {data.notes} AI-drafted note{data.notes === 1 ? "" : "s"} × {data.minutesPerNote} min each (assumed)
      </p>
      <MiniColumns
        caption="Estimated hours saved per day"
        highlight={today}
        columns={data.perDay.map((d) => ({
          key: d.day,
          label: d.day === today ? "Today" : shortWeekday(d.day),
          value: d.hours,
          tooltip: `${formatNzDay(d.day)}: ${d.notes} AI note${d.notes === 1 ? "" : "s"}, about ${formatHours(d.hours)} saved`,
        }))}
      />
    </section>
  );
}

/** Productivity charts under the shift dashboard. */
export function DashboardInsights({ data }: { data: DashboardData }) {
  return (
    <section aria-labelledby="productivity" className="space-y-4">
      <h2 id="productivity" className="text-lg font-semibold text-hippo-900">
        Productivity
      </h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Turnaround data={data.turnaround} today={data.today} />
        <Workload rows={data.workload} />
        <TimeSaved data={data.saved} today={data.today} />
      </div>
    </section>
  );
}
