import { AvailabilityForm } from "@/components/referrals/availability-form";
import { formatFee, formatUpdated, formatWait, serviceLabel } from "@/lib/referrals/logic";
import type { ReferralFacility } from "@/types/referral";

export function SectorBadge({ sector }: { sector: ReferralFacility["sector"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        sector === "public" ? "bg-hippo-600 text-white" : "bg-off-white text-hippo-900 ring-1 ring-hippo-200"
      }`}
    >
      {sector === "public" ? "Public" : "Private"}
    </span>
  );
}

/** One facility in the directory, with its availability and an editor. */
export function FacilityCard({
  facility,
  updaterName,
  now,
}: {
  facility: ReferralFacility;
  updaterName?: string;
  now: Date;
}) {
  return (
    <li className={`rounded-[20px] border bg-white p-5 ${facility.accepting ? "border-hippo-200" : "border-red-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-hippo-900">{facility.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <SectorBadge sector={facility.sector} />
            {facility.accFunded && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900">ACC</span>
            )}
            {facility.services.map((s) => (
              <span key={s} className="text-charcoal/80">
                {serviceLabel(s)}
              </span>
            ))}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className={`font-semibold ${facility.accepting ? "text-hippo-900" : "text-red-700"}`}>{formatWait(facility)}</p>
          <p className="text-charcoal/80">{formatFee(facility)}</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-charcoal sm:grid-cols-2">
        <div>
          <dt className="sr-only">Address</dt>
          <dd>{facility.address}</dd>
        </div>
        {facility.phone && (
          <div>
            <dt className="sr-only">Phone</dt>
            <dd>
              <a href={`tel:${facility.phone.replace(/\s/g, "")}`} className="text-hippo-600 hover:underline">
                {facility.phone}
              </a>
            </dd>
          </div>
        )}
        {facility.hours && (
          <div>
            <dt className="sr-only">Hours</dt>
            <dd>{facility.hours}</dd>
          </div>
        )}
        {facility.accessNote && (
          <div>
            <dt className="sr-only">Access</dt>
            <dd>{facility.accessNote}</dd>
          </div>
        )}
      </dl>
      {facility.priceNote && <p className="mt-2 text-sm text-charcoal/80">{facility.priceNote}</p>}
      <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-charcoal/70">
        <span>{formatUpdated(facility, updaterName, now)}</span>
        {facility.website && (
          <a href={facility.website} target="_blank" rel="noreferrer" className="text-hippo-600 hover:underline">
            Website
          </a>
        )}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium text-hippo-600">Update availability</summary>
        <AvailabilityForm facility={facility} />
      </details>
    </li>
  );
}
