"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinician } from "@/lib/auth";
import { getClinicianName } from "@/lib/data/notes";
import { getPatientRecord, listConsultations } from "@/lib/data/queries";
import {
  createReferral,
  getFacility,
  getReferral,
  setReferralStatus,
  updateFacilityAvailability,
} from "@/lib/data/referrals";
import { ageOn } from "@/lib/handover/build";
import { composeLetter } from "@/lib/referrals/letter";
import {
  facilityUpdateSchema,
  letterDraftSchema,
  referralCreateSchema,
  referralStatusSchema,
} from "@/lib/referrals/logic";
import { idSchema } from "@/lib/validation";
import { LetterError, draftLetterBody } from "@/services/referralLetter";

export type ReferralFormState = { error?: string; success?: string };

function refreshReferrals(patientId?: string) {
  revalidatePath("/referrals");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (patientId) revalidatePath(`/patients/${patientId}`);
  revalidatePath("/", "layout"); // header task count
}

/** Staff keep availability current: accepting, wait, price. */
export async function updateFacilityAction(_: ReferralFormState, form: FormData): Promise<ReferralFormState> {
  const { supabase } = await requireClinician();
  const parsed = facilityUpdateSchema.safeParse({
    id: form.get("facilityId"),
    accepting: form.get("accepting") === "on",
    waitDays: form.get("waitDays"),
    feeNzd: form.get("feeNzd"),
    priceNote: form.get("priceNote") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const { id, ...changes } = parsed.data;
  const facility = await updateFacilityAvailability(supabase, id, changes);
  if (!facility) return { error: "Couldn’t save. Try again." };
  revalidatePath("/referrals");
  return { success: "Saved. Thanks for keeping this current." };
}

/** Drafts the full letter for review. The AI sees no names or identifiers. */
export async function draftLetterAction(input: {
  patientId: string;
  facilityId: string;
  service: string;
  urgency: string;
  reason: string;
}): Promise<{ letter?: string; error?: string }> {
  const { supabase, userId, email } = await requireClinician();
  const parsed = letterDraftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the referral details." };
  const { patientId, facilityId, service, urgency, reason } = parsed.data;
  const [record, consultations, facility, clinicianName] = await Promise.all([
    getPatientRecord(supabase, patientId),
    listConsultations(supabase, patientId),
    getFacility(supabase, facilityId),
    getClinicianName(supabase, userId),
  ]);
  if (!record || !facility) return { error: "That patient or facility could not be found." };
  const latest = consultations.find((c) => c.finalNote || c.generatedDraft);
  try {
    const body = await draftLetterBody({
      facilityName: facility.name,
      service,
      urgency,
      reason,
      age: ageOn(record.patient.dateOfBirth, new Date()),
      note: latest?.finalNote ?? latest?.generatedDraft,
      medications: record.medications,
      conditions: record.conditions,
    });
    return {
      letter: composeLetter({
        facilityName: facility.name,
        service,
        urgency,
        patientName: `${record.patient.firstName} ${record.patient.lastName}`,
        dateOfBirth: record.patient.dateOfBirth,
        nhi: record.patient.nhi,
        body,
        clinicianName: clinicianName ?? email,
        date: new Date(),
      }),
    };
  } catch (error) {
    return { error: error instanceof LetterError ? error.message : "The letter could not be drafted. Try again." };
  }
}

export async function createReferralAction(_: ReferralFormState, form: FormData): Promise<ReferralFormState> {
  const { supabase, userId } = await requireClinician();
  const parsed = referralCreateSchema.safeParse({
    patientId: form.get("patientId"),
    consultationId: form.get("consultationId") || undefined,
    facilityId: form.get("facilityId") ?? "",
    service: form.get("service"),
    urgency: form.get("urgency"),
    reason: form.get("reason") ?? "",
    letter: form.get("letter") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the referral details." };
  const facility = await getFacility(supabase, parsed.data.facilityId);
  if (!facility) return { error: "Choose where to refer." };
  const referral = await createReferral(supabase, { ...parsed.data, facility, referrerId: userId });
  if (!referral) return { error: "Couldn’t save the referral. Try again." };
  refreshReferrals(referral.patientId);
  redirect(`/referrals/${referral.id}?created=1`);
}

export async function setReferralStatusAction(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse(form.get("referralId"));
  const status = referralStatusSchema.safeParse(form.get("status"));
  if (!id.success || !status.success) return;
  const referral = await getReferral(supabase, id.data);
  if (!referral) return;
  await setReferralStatus(supabase, referral, status.data);
  refreshReferrals(referral.patientId);
  revalidatePath(`/referrals/${referral.id}`);
}
