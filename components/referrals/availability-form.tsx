"use client";
import { useActionState } from "react";
import { updateFacilityAction, type ReferralFormState } from "@/app/referrals/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import type { ReferralFacility } from "@/types/referral";

/** Lets any clinician keep a facility's availability and price current. */
export function AvailabilityForm({ facility }: { facility: ReferralFacility }) {
  const [state, action, saving] = useActionState<ReferralFormState, FormData>(updateFacilityAction, {});
  return (
    <form action={action} className="mt-3 space-y-3 rounded-2xl bg-hippo-50 p-4 text-sm">
      <input type="hidden" name="facilityId" value={facility.id} />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="accepting" defaultChecked={facility.accepting} className="size-4" />
        Accepting referrals
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`wait-${facility.id}`} className="mb-1 block font-medium">
            Wait (days)
          </label>
          <input
            id={`wait-${facility.id}`}
            name="waitDays"
            type="number"
            min={0}
            max={730}
            defaultValue={facility.waitDays ?? ""}
            placeholder="Unknown"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`fee-${facility.id}`} className="mb-1 block font-medium">
            Typical patient cost ($)
          </label>
          <input
            id={`fee-${facility.id}`}
            name="feeNzd"
            type="number"
            min={0}
            max={100000}
            defaultValue={facility.feeNzd ?? ""}
            placeholder="On request"
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`price-${facility.id}`} className="mb-1 block font-medium">
          Price note
        </label>
        <input
          id={`price-${facility.id}`}
          name="priceNote"
          maxLength={300}
          defaultValue={facility.priceNote ?? ""}
          className={fieldClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save availability"}
        </Button>
        <p aria-live="polite" className={state.error ? "text-red-700" : "text-emerald-800"}>
          {state.error || state.success}
        </p>
      </div>
    </form>
  );
}
