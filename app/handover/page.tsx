import Link from "next/link";
import { HandoverList } from "@/components/handover/handover-list";
import { PrintButton } from "@/components/handover/print-button";
import { requireClinician } from "@/lib/auth";
import { loadHandover } from "@/lib/data/handover";
import { listShifts } from "@/lib/data/roster";
import { OnShiftNow } from "@/components/roster/on-shift-now";
import { onShiftNow } from "@/lib/roster/logic";

export const dynamic = "force-dynamic";
export const metadata = { title: "Handover" };

const WINDOWS = [
  { hours: 12, label: "Last 12 h" },
  { hours: 24, label: "Last 24 h" },
  { hours: 72, label: "Last 3 days" },
  { hours: 168, label: "Last 7 days" },
];

export default async function HandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const { supabase } = await requireClinician();
  const requested = Number((await searchParams).hours);
  const hours = WINDOWS.some((w) => w.hours === requested) ? requested : 24;
  const now = new Date();
  const [{ items, truncated }, shifts] = await Promise.all([
    loadHandover(supabase, hours),
    listShifts(supabase, new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 86_400_000)),
  ]);
  const generatedAt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const flagged = items.filter((i) => i.flags.length).length;

  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-10 lg:px-[30px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-body-2 mb-3 text-hippo-900/80">SHIFT HANDOVER</p>
          <h1 className="text-h2 text-hippo-900">Handover</h1>
          <p className="mt-3 max-w-prose text-sm leading-6 text-charcoal">
            SBAR for every patient seen in this period or with tasks due. Built only from stored notes
            and tasks, so each line can be checked against the record.
          </p>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </div>

      <div className="mt-8">
        <OnShiftNow shifts={onShiftNow(shifts, now)} />
      </div>

      <nav aria-label="Handover period" className="mt-8 flex flex-wrap gap-2 print:hidden">
        {WINDOWS.map((w) => (
          <Link
            key={w.hours}
            href={`/handover?hours=${w.hours}`}
            aria-current={w.hours === hours ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              w.hours === hours ? "bg-hippo-600 text-white" : "bg-white text-hippo-900 ring-1 ring-hippo-200 hover:bg-hippo-100"
            }`}
          >
            {w.label}
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-sm text-charcoal">
        {items.length} patient{items.length === 1 ? "" : "s"}
        {flagged ? `, ${flagged} needing attention` : ""}. Generated {generatedAt}.
        {truncated && " Showing the first 40 patients."}
      </p>

      <HandoverList items={items} />
    </main>
  );
}
