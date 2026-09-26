import Link from "next/link";
import { notFound } from "next/navigation";
import { setReferralStatusAction } from "@/app/referrals/actions";
import { PrintButton } from "@/components/handover/print-button";
import { ReferralStatusBadge } from "@/components/referrals/status-badge";
import { Button } from "@/components/ui/button";
import { requireClinician } from "@/lib/auth";
import { getFacility, getReferral } from "@/lib/data/referrals";
import { listClinicians } from "@/lib/data/tasks";
import { formatFee, formatWait, serviceLabel, urgencyLabel } from "@/lib/referrals/logic";
import { idSchema } from "@/lib/validation";
import type { ReferralStatus } from "@/types/referral";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referral" };

const NEXT: { status: ReferralStatus; label: string; variant: "default" | "outline" | "ghost" }[] = [
  { status: "acknowledged", label: "Mark acknowledged", variant: "default" },
  { status: "completed", label: "Patient seen", variant: "outline" },
  { status: "cancelled", label: "Cancel referral", variant: "ghost" },
  { status: "sent", label: "Back to awaiting acknowledgement", variant: "ghost" },
];

export default async function ReferralPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const referral = await getReferral(supabase, id.data);
  if (!referral) notFound();
  const [facility, clinicians] = await Promise.all([getFacility(supabase, referral.facilityId), listClinicians(supabase)]);
  const created = (await searchParams).created === "1";
  const referrer = clinicians.find((c) => c.id === referral.createdBy)?.name;

  return (
    <main id="main" className="mx-auto max-w-4xl space-y-6 px-5 py-10 lg:px-[30px]">
      {created && (
        <p role="status" className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm text-emerald-900 print:hidden">
          Referral saved. A task to chase the acknowledgement is on the dashboard. Print or copy the letter below to send it.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="text-body-2 mb-3 text-hippo-900/80">REFERRAL</p>
          <h1 className="text-h2 text-hippo-900">
            {serviceLabel(referral.service)}: {referral.facilityName}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-charcoal">
            <Link href={`/patients/${referral.patientId}`} className="font-medium text-hippo-600 hover:underline">
              {referral.patientName}
            </Link>
            · {urgencyLabel(referral.urgency)}
            {referrer && <> · by {referrer}</>}
            <ReferralStatusBadge status={referral.status} />
          </p>
        </div>
        <PrintButton />
      </div>

      {facility && (
        <section className="rounded-[20px] border border-hippo-200 bg-white p-5 text-sm print:hidden">
          <p className="font-semibold text-hippo-900">{facility.name}</p>
          <p className="mt-1 text-charcoal">
            {facility.address}
            {facility.phone && (
              <>
                {" · "}
                <a href={`tel:${facility.phone.replace(/\s/g, "")}`} className="text-hippo-600 hover:underline">
                  {facility.phone}
                </a>
              </>
            )}
          </p>
          <p className="mt-1 text-charcoal/80">
            {formatWait(facility)} · {formatFee(facility)}
          </p>
        </section>
      )}

      <section aria-label="Referral letter" className="rounded-[20px] border border-hippo-200 bg-white p-6 print:border-0 print:p-0">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{referral.letter}</pre>
      </section>

      <section aria-label="Update status" className="flex flex-wrap gap-2 print:hidden">
        {NEXT.filter((n) => n.status !== referral.status).map((n) => (
          <form key={n.status} action={setReferralStatusAction}>
            <input type="hidden" name="referralId" value={referral.id} />
            <Button type="submit" name="status" value={n.status} variant={n.variant}>
              {n.label}
            </Button>
          </form>
        ))}
      </section>
      <p className="text-xs text-charcoal/70 print:hidden">
        Marking it acknowledged, seen or cancelled also ticks off the chase task.
      </p>
    </main>
  );
}
