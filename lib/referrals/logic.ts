// Pure referral logic: services, suggestions from a note, comparing facilities and when
// to chase. No database or secrets here, so it runs in tests and in the browser.
import { z } from "zod";
import type { ClinicalNote } from "@/types/consultation";
import type {
  ReferralFacility,
  ReferralService,
  ReferralStatus,
  ReferralUrgency,
} from "@/types/referral";

export const SERVICES: { key: ReferralService; label: string }[] = [
  { key: "fracture_clinic", label: "Fracture clinic" },
  { key: "xray", label: "X-ray" },
  { key: "ct_mri", label: "CT / MRI" },
  { key: "ultrasound", label: "Ultrasound" },
  { key: "orthopaedics", label: "Orthopaedics" },
  { key: "physiotherapy", label: "Physiotherapy" },
  { key: "cardiology", label: "Cardiology" },
  { key: "dermatology", label: "Dermatology / skin" },
  { key: "urgent_care", label: "Urgent care" },
  { key: "surgery", label: "Private surgery" },
];
export const SERVICE_KEYS = SERVICES.map((s) => s.key) as [ReferralService, ...ReferralService[]];
export const serviceLabel = (key: string) => SERVICES.find((s) => s.key === key)?.label ?? key;

export const URGENCY: { key: ReferralUrgency; label: string; chaseHours: number }[] = [
  { key: "urgent", label: "Urgent", chaseHours: 24 },
  { key: "soon", label: "Soon (within 2 weeks)", chaseHours: 72 },
  { key: "routine", label: "Routine", chaseHours: 7 * 24 },
];
export const urgencyLabel = (key: string) => URGENCY.find((u) => u.key === key)?.label ?? key;

export const STATUS_LABEL: Record<ReferralStatus, string> = {
  sent: "Sent, awaiting acknowledgement",
  acknowledged: "Acknowledged",
  completed: "Patient seen",
  cancelled: "Cancelled",
};

// Keyword cues in the clinician's own words that point to a service, most specific first.
const CUES: { service: ReferralService; pattern: RegExp }[] = [
  { service: "fracture_clinic", pattern: /\b(fractur\w*|broken|cast|splint|fracture clinic|scaphoid|colles)\b/i },
  { service: "ct_mri", pattern: /\b(ct|mri|cat scan|ct scan|mri scan)\b/i },
  { service: "ultrasound", pattern: /\b(ultrasound|sonograph\w*|scan of (the )?(abdomen|pelvis|neck))\b/i },
  { service: "xray", pattern: /\b(x-?rays?|cxr|radiograph\w*)\b/i },
  { service: "cardiology", pattern: /\b(cardiolog\w*|echo(cardiogram)?|angiogra\w*|exercise tolerance test|palpitations?|chest pain|arrhythmia|murmur)\b/i },
  { service: "orthopaedics", pattern: /\b(orthop(a)?edic\w*|joint replacement|hip replacement|knee replacement)\b/i },
  { service: "physiotherapy", pattern: /\b(physio\w*|rehab\w*)\b/i },
  { service: "dermatology", pattern: /\b(dermatolog\w*|skin lesion|mole|melanoma|bcc|scc|skin check)\b/i },
  { service: "surgery", pattern: /\b(surgeon|surgical|surgery)\b/i },
];

/** Services the note's plan, follow-up and assessment point to, strongest first. */
export function suggestServices(
  note: Partial<Pick<ClinicalNote, "plan" | "followUp" | "assessment">> | undefined,
): ReferralService[] {
  if (!note) return [];
  const text = [note.plan, note.followUp, note.assessment].filter(Boolean).join(" ");
  return CUES.filter((c) => c.pattern.test(text)).map((c) => c.service);
}

export type FacilitySort = "wait" | "cost" | "name";

/**
 * Facilities offering `service`, accepting ones first, then by the chosen sort. Unknown
 * waits and prices sort last so the known ones are easy to compare.
 */
export function compareFacilities(
  facilities: ReferralFacility[],
  service: ReferralService | undefined,
  sort: FacilitySort = "wait",
) {
  const last = (n: number | undefined) => (n === undefined ? Number.POSITIVE_INFINITY : n);
  return facilities
    .filter((f) => !service || f.services.includes(service))
    .sort((a, b) => {
      if (a.accepting !== b.accepting) return a.accepting ? -1 : 1;
      const byWait = last(a.waitDays) - last(b.waitDays);
      const byCost = last(a.feeNzd) - last(b.feeNzd);
      const primary = sort === "wait" ? byWait || byCost : sort === "cost" ? byCost || byWait : 0;
      return primary || a.name.localeCompare(b.name);
    });
}

export function formatWait(f: Pick<ReferralFacility, "waitDays" | "waitIsEstimate" | "accepting">) {
  if (!f.accepting) return "Not accepting referrals";
  if (f.waitDays === undefined) return "Wait not known";
  const days = f.waitDays;
  const text =
    days === 0
      ? "Same day"
      : days < 14
        ? `${days} day${days === 1 ? "" : "s"}`
        : days < 60
          ? `About ${Math.round(days / 7)} weeks`
          : `About ${Math.round(days / 30)} months`;
  return f.waitIsEstimate ? `${text} (estimate)` : text;
}

export function formatFee(f: Pick<ReferralFacility, "feeNzd" | "sector">) {
  if (f.feeNzd === 0) return "Free";
  if (f.feeNzd === undefined) return f.sector === "public" ? "Free (public)" : "Price on request";
  return `From $${f.feeNzd}`;
}

/** When to chase an acknowledgement, and the task title that tracks it. */
export function chaseTask(facilityName: string, urgency: ReferralUrgency, now = new Date()) {
  const hours = URGENCY.find((u) => u.key === urgency)?.chaseHours ?? 7 * 24;
  return {
    title: `Chase ${facilityName} referral acknowledgement`.slice(0, 200),
    dueAt: new Date(now.getTime() + hours * 3_600_000).toISOString(),
  };
}

// Validation for the forms and actions ------------------------------------------------

export const referralServiceSchema = z.enum(SERVICE_KEYS);
export const referralUrgencySchema = z.enum(["routine", "soon", "urgent"]);
export const referralStatusSchema = z.enum(["sent", "acknowledged", "completed", "cancelled"]);

export const referralCreateSchema = z.object({
  patientId: z.uuid(),
  consultationId: z.uuid().optional(),
  facilityId: z.uuid({ message: "Choose where to refer." }),
  service: referralServiceSchema,
  urgency: referralUrgencySchema,
  reason: z.string().trim().min(1, "Give a reason for the referral.").max(500),
  letter: z.string().trim().min(1, "Write or draft the referral letter first.").max(10000),
});

export const letterDraftSchema = z.object({
  patientId: z.uuid(),
  facilityId: z.uuid({ message: "Choose where to refer first." }),
  service: referralServiceSchema,
  urgency: referralUrgencySchema,
  reason: z.string().trim().min(1, "Give a reason for the referral first.").max(500),
});

const optionalInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(0).max(max).optional(),
  );
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const facilityUpdateSchema = z.object({
  id: z.uuid(),
  accepting: z.boolean(),
  waitDays: optionalInt(730),
  feeNzd: optionalInt(100000),
  priceNote: optionalText(300),
});

/** "Updated by Dr X 3 h ago" or, for untouched estimates, where the numbers came from. */
export function formatUpdated(
  f: Pick<ReferralFacility, "updatedAt" | "updatedBy" | "waitIsEstimate">,
  updaterName: string | undefined,
  now = new Date(),
) {
  if (!f.updatedBy) return "Wait is an estimate. Confirm with the facility.";
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(f.updatedAt)) / 60000));
  const ago =
    mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 48 * 60 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`;
  return `Updated by ${updaterName ?? "a clinician"} ${ago}`;
}
