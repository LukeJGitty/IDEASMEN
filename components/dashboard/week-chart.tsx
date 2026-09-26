import { shortWeekday } from "@/lib/dashboard/summary";
import { formatNzDay } from "@/lib/time";

/** Consultations per day for the last 7 days: one series, one axis, hover for exact values, a table for screen readers. */
export function WeekChart({ week, today }: { week: { day: string; count: number }[]; today: string }) {
  const max = Math.max(1, ...week.map((d) => d.count));
  const total = week.reduce((sum, d) => sum + d.count, 0);
  const peak = week.reduce((best, d) => (d.count > best.count ? d : best), week[0]);
  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-hippo-900">Consultations, last 7 days</span>
        <span className="text-xs text-charcoal/80">{total} in total</span>
      </figcaption>
      <div className="mt-4 flex h-36 items-end gap-2 border-b border-hippo-200 pt-6" aria-hidden="true">
        {week.map((d) => {
          const isToday = d.day === today;
          const label = `${formatNzDay(d.day)}: ${d.count} consultation${d.count === 1 ? "" : "s"}`;
          const showValue = d.count > 0 && (isToday || d === peak);
          const pct = Math.max(d.count ? 4 : 0, (d.count / max) * 100);
          return (
            <div
              key={d.day}
              className="group relative flex h-full flex-1 items-end justify-center"
            >
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-lg bg-hippo-900 px-2 py-1 text-xs text-white shadow group-hover:block"
              >
                {label}
              </span>
              {showValue && (
                <span className="absolute text-xs font-medium text-charcoal" style={{ bottom: `calc(${pct}% + 2px)` }}>
                  {d.count}
                </span>
              )}
              <div
                className={`w-full max-w-6 rounded-t-[4px] transition-colors ${
                  isToday ? "bg-hippo-600" : "bg-hippo-300 group-hover:bg-hippo-400"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 text-center text-xs text-charcoal/80" aria-hidden="true">
        {week.map((d) => (
          <span key={d.day} className={`flex-1 ${d.day === today ? "font-semibold text-hippo-900" : ""}`}>
            {d.day === today ? "Today" : shortWeekday(d.day)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Consultations per day, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Consultations</th>
          </tr>
        </thead>
        <tbody>
          {week.map((d) => (
            <tr key={d.day}>
              <td>{formatNzDay(d.day)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
