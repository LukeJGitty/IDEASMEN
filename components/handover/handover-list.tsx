import Link from "next/link";
import type { HandoverItem } from "@/lib/handover/build";

export function HandoverList({ items }: { items: HandoverItem[] }) {
  return (
    <>
      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-hippo-300 px-5 py-10 text-sm text-charcoal">
          Nobody to hand over: no consultations in this period and no tasks due in the next day.
        </p>
      ) : (
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.patientId}
              className={`break-inside-avoid rounded-[20px] border bg-white p-5 ${
                item.flags.length ? "border-amber-300" : "border-hippo-200"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/patients/${item.patientId}`} className="text-lg font-semibold text-hippo-900 hover:underline">
                  {item.name}
                  {item.age !== undefined && <span className="font-normal text-charcoal">, {item.age}</span>}
                </Link>
                {item.latestConsultationId && (
                  <Link href={`/consultations/${item.latestConsultationId}`} className="text-sm text-hippo-600 hover:underline print:hidden">
                    Open note
                  </Link>
                )}
              </div>
              {item.flags.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-2">
                  {item.flags.map((f) => (
                    <span key={f} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                      {f}
                    </span>
                  ))}
                </p>
              )}
              <dl className="mt-4 grid grid-cols-[1.75rem_1fr] gap-x-2 gap-y-3 text-sm leading-6">
                <dt className="font-bold text-hippo-600" title="Situation">S</dt>
                <dd>{item.situation}</dd>
                <dt className="font-bold text-hippo-600" title="Background">B</dt>
                <dd>{item.background}</dd>
                <dt className="font-bold text-hippo-600" title="Assessment">A</dt>
                <dd>{item.assessment}</dd>
                <dt className="font-bold text-hippo-600" title="Recommendation">R</dt>
                <dd>
                  <ul className="list-disc space-y-1 pl-4">
                    {item.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
