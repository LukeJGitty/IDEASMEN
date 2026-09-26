import Link from "next/link";
import { ReferralStatusBadge } from "@/components/referrals/status-badge";
import type { ReferralWithNames } from "@/lib/data/referrals";
import { serviceLabel, urgencyLabel } from "@/lib/referrals/logic";

const date = (iso: string) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" }).format(new Date(iso));

/** Referrals, newest first. `showPatient` is off on a patient's own page. */
export function ReferralList({
  referrals,
  showPatient = true,
  empty,
}: {
  referrals: ReferralWithNames[];
  showPatient?: boolean;
  empty: string;
}) {
  if (referrals.length === 0) return <p className="text-sm text-charcoal">{empty}</p>;
  return (
    <ul className="divide-y divide-hippo-100">
      {referrals.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link href={`/referrals/${r.id}`} className="font-medium text-hippo-900 hover:underline">
              {serviceLabel(r.service)}: {r.facilityName}
            </Link>
            <p className="mt-0.5 text-sm text-charcoal/80">
              {showPatient && <>{r.patientName} · </>}
              {urgencyLabel(r.urgency)} · {date(r.createdAt)}
            </p>
          </div>
          <ReferralStatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}
