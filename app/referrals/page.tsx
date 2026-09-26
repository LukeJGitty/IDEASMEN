import Link from "next/link";
import { FacilityCard } from "@/components/referrals/facility-card";
import { ReferralList } from "@/components/referrals/referral-list";
import { requireClinician } from "@/lib/auth";
import { listFacilities, listReferrals } from "@/lib/data/referrals";
import { listClinicians } from "@/lib/data/tasks";
import { SERVICES, compareFacilities, referralServiceSchema } from "@/lib/referrals/logic";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referrals" };

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { supabase } = await requireClinician();
  const parsed = referralServiceSchema.safeParse((await searchParams).service);
  const service = parsed.success ? parsed.data : undefined;
  const [facilities, referrals, clinicians] = await Promise.all([
    listFacilities(supabase),
    listReferrals(supabase, { limit: 20 }),
    listClinicians(supabase),
  ]);
  const now = new Date();
  const shown = compareFacilities(facilities, service, "wait");
  const open = referrals.filter((r) => r.status === "sent");

  return (
    <main id="main" className="mx-auto max-w-5xl space-y-10 px-5 py-10 lg:px-[30px]">
      <div>
        <p className="text-body-2 mb-3 text-hippo-900/80">REFERRALS</p>
        <h1 className="text-h2 text-hippo-900">Referrals</h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-charcoal">
          Compare Canterbury services on wait and cost, and keep availability current for the whole team. To refer a
          patient, open their record and choose <strong>Make a referral</strong>.
        </p>
      </div>

      <section aria-labelledby="recent" className="rounded-[20px] border border-hippo-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent" className="text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900">
            Recent referrals
          </h2>
          <span className="text-xs text-charcoal/80">{open.length} awaiting acknowledgement</span>
        </div>
        <div className="mt-2">
          <ReferralList referrals={referrals} empty="No referrals yet." />
        </div>
      </section>

      <section aria-labelledby="directory" className="space-y-4">
        <div>
          <h2 id="directory" className="text-lg font-semibold text-hippo-900">
            Directory
          </h2>
          <p className="mt-1 text-sm text-charcoal">
            Real Canterbury providers. Wait times start as estimates, because providers don’t publish them. When
            someone confirms a wait by phone, update it here and it’s marked with who and when.
          </p>
        </div>
        <nav aria-label="Filter by service" className="flex flex-wrap gap-2">
          <Link
            href="/referrals"
            aria-current={!service ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${!service ? "bg-hippo-600 text-white" : "bg-white text-hippo-900 ring-1 ring-hippo-200 hover:bg-hippo-100"}`}
          >
            All
          </Link>
          {SERVICES.map((s) => (
            <Link
              key={s.key}
              href={`/referrals?service=${s.key}`}
              aria-current={service === s.key ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${service === s.key ? "bg-hippo-600 text-white" : "bg-white text-hippo-900 ring-1 ring-hippo-200 hover:bg-hippo-100"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <ul className="space-y-3">
          {shown.map((f) => (
            <FacilityCard
              key={f.id}
              facility={f}
              updaterName={clinicians.find((c) => c.id === f.updatedBy)?.name}
              now={now}
            />
          ))}
        </ul>
        <p className="text-xs text-charcoal/70">
          Prices are what each provider publishes, where they do. Public services are free for eligible patients; ACC
          contributes to injury treatment and a part-charge may apply.
        </p>
      </section>
    </main>
  );
}
