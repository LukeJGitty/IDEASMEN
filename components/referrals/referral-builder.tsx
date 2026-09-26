"use client";
import { Sparkles } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  createReferralAction,
  draftLetterAction,
  type ReferralFormState,
} from "@/app/referrals/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import {
  SERVICES,
  URGENCY,
  compareFacilities,
  formatFee,
  formatWait,
  type FacilitySort,
} from "@/lib/referrals/logic";
import type { ReferralFacility, ReferralService, ReferralUrgency } from "@/types/referral";

type Sector = "all" | "public" | "private";

const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium ${
    active ? "bg-hippo-600 text-white" : "bg-white text-hippo-900 ring-1 ring-hippo-200 hover:bg-hippo-100"
  }`;

/**
 * Pick a service (suggested from the latest note), compare facilities on wait and cost,
 * draft the letter with AI, edit it, and save. Saving also creates a chase task.
 */
export function ReferralBuilder({
  patientId,
  consultationId,
  facilities,
  suggested,
  defaultReason,
}: {
  patientId: string;
  consultationId?: string;
  facilities: ReferralFacility[];
  suggested: ReferralService[];
  defaultReason: string;
}) {
  const [service, setService] = useState<ReferralService>(suggested[0] ?? "fracture_clinic");
  const [sort, setSort] = useState<FacilitySort>("wait");
  const [sector, setSector] = useState<Sector>("all");
  const [facilityId, setFacilityId] = useState<string>("");
  const [urgency, setUrgency] = useState<ReferralUrgency>("routine");
  const [reason, setReason] = useState(defaultReason);
  const [letter, setLetter] = useState("");
  const [draftError, setDraftError] = useState<string>();
  const [drafting, startDraft] = useTransition();
  const [state, save, saving] = useActionState<ReferralFormState, FormData>(createReferralAction, {});

  const options = useMemo(
    () => compareFacilities(facilities, service, sort).filter((f) => sector === "all" || f.sector === sector),
    [facilities, service, sort, sector],
  );
  const chosen = options.find((f) => f.id === facilityId);

  const pickService = (key: ReferralService) => {
    setService(key);
    setFacilityId("");
  };

  const draft = () =>
    startDraft(async () => {
      setDraftError(undefined);
      const result = await draftLetterAction({ patientId, facilityId, service, urgency, reason });
      if (result.letter) setLetter(result.letter);
      else setDraftError(result.error);
    });

  return (
    <form action={save} className="space-y-8">
      <input type="hidden" name="patientId" value={patientId} />
      {consultationId && <input type="hidden" name="consultationId" value={consultationId} />}
      <input type="hidden" name="service" value={service} />
      <input type="hidden" name="facilityId" value={chosen ? chosen.id : ""} />

      <section aria-labelledby="step-service">
        <h2 id="step-service" className="text-lg font-semibold text-hippo-900">
          1. What does the patient need?
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <button key={s.key} type="button" onClick={() => pickService(s.key)} className={chip(s.key === service)} aria-pressed={s.key === service}>
              {s.label}
              {suggested.includes(s.key) && <span className="ml-1.5 text-xs opacity-80">· suggested</span>}
            </button>
          ))}
        </div>
        {suggested.length > 0 && (
          <p className="mt-2 text-xs text-charcoal/80">Suggestions come from the plan in the latest note.</p>
        )}
      </section>

      <section aria-labelledby="step-where">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="step-where" className="text-lg font-semibold text-hippo-900">
            2. Where?
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <label className="flex items-center gap-2">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as FacilitySort)} className="rounded-xl border border-hippo-200 bg-white px-3 py-1.5">
                <option value="wait">Shortest wait</option>
                <option value="cost">Lowest cost</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Show
              <select value={sector} onChange={(e) => setSector(e.target.value as Sector)} className="rounded-xl border border-hippo-200 bg-white px-3 py-1.5">
                <option value="all">Public and private</option>
                <option value="public">Public only</option>
                <option value="private">Private only</option>
              </select>
            </label>
          </div>
        </div>
        {options.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-hippo-300 px-4 py-6 text-sm text-charcoal">
            No facilities in the directory for this service and filter.
          </p>
        ) : (
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Choose a facility</legend>
            {options.map((f) => (
              <label
                key={f.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 ${
                  f.id === facilityId ? "border-hippo-600 ring-2 ring-hippo-600" : "border-hippo-200"
                } ${f.accepting ? "" : "opacity-60"}`}
              >
                <input
                  type="radio"
                  name="facilityChoice"
                  value={f.id}
                  checked={f.id === facilityId}
                  onChange={() => setFacilityId(f.id)}
                  disabled={!f.accepting}
                  className="mt-1 size-4"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-hippo-900">{f.name}</span>
                    <span className="text-sm">
                      <span className={f.accepting ? "font-semibold text-hippo-900" : "font-semibold text-red-700"}>{formatWait(f)}</span>
                      <span className="text-charcoal/80"> · {formatFee(f)}</span>
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-charcoal/80">
                    {f.sector === "public" ? "Public" : "Private"}
                    {f.accFunded ? " · ACC" : ""} · {f.address}
                    {f.phone ? ` · ${f.phone}` : ""}
                  </span>
                  {f.priceNote && <span className="mt-1 block text-xs text-charcoal/70">{f.priceNote}</span>}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <p className="mt-2 text-xs text-charcoal/70">
          Waits marked “estimate” haven’t been confirmed by the team yet. Update them on the Referrals page.
        </p>
      </section>

      <section aria-labelledby="step-details" className="space-y-4">
        <h2 id="step-details" className="text-lg font-semibold text-hippo-900">
          3. Urgency and reason
        </h2>
        <div className="flex flex-wrap gap-2">
          {URGENCY.map((u) => (
            <label key={u.key} className={`${chip(u.key === urgency)} cursor-pointer`}>
              <input type="radio" name="urgency" value={u.key} checked={u.key === urgency} onChange={() => setUrgency(u.key)} className="sr-only" />
              {u.label}
            </label>
          ))}
        </div>
        <div>
          <label htmlFor="reason" className="mb-2 block text-sm font-medium">
            Reason for referral
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: suspected scaphoid fracture after a fall, X-ray inconclusive"
            className={`${fieldClass} text-sm leading-6`}
            required
          />
        </div>
      </section>

      <section aria-labelledby="step-letter" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="step-letter" className="text-lg font-semibold text-hippo-900">
            4. Letter
          </h2>
          <Button type="button" variant="outline" onClick={draft} disabled={drafting || !chosen || !reason.trim()}>
            <Sparkles aria-hidden="true" /> {drafting ? "Drafting…" : letter ? "Redraft with AI" : "Draft with AI"}
          </Button>
        </div>
        {!chosen && <p className="text-sm text-charcoal/80">Choose a facility first.</p>}
        {draftError && (
          <p role="alert" className="text-sm text-red-700">
            {draftError}
          </p>
        )}
        {letter && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm">
            AI draft. Check every line against the record before saving. The AI was given no name or NHI; Hippo adds those.
          </p>
        )}
        <textarea
          name="letter"
          rows={16}
          maxLength={10000}
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          placeholder="Draft with AI, or write the letter yourself."
          className={`${fieldClass} font-mono text-sm leading-6`}
          aria-label="Referral letter"
          required
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-hippo-200 pt-6">
        <Button type="submit" size="lg" disabled={saving || !chosen || !letter.trim()}>
          {saving ? "Saving…" : "Save referral"}
        </Button>
        <p className="text-sm text-charcoal/80">
          Saving adds a task to chase the acknowledgement. Print or copy the letter to send it.
        </p>
        {state.error && (
          <p role="alert" className="w-full text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
