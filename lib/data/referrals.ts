import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { QueryError } from "@/lib/data/queries";
import { createTask, updateTask } from "@/lib/data/tasks";
import { SERVICE_KEYS, chaseTask } from "@/lib/referrals/logic";
import type {
  Referral,
  ReferralFacility,
  ReferralService,
  ReferralStatus,
  ReferralUrgency,
} from "@/types/referral";

type Client = SupabaseClient<Database>;
const opt = <T>(value: T | null) => value ?? undefined;
const isService = (s: string): s is ReferralService => (SERVICE_KEYS as string[]).includes(s);

export function toFacility(row: Tables<"referral_facilities">): ReferralFacility {
  return {
    id: row.id,
    name: row.name,
    services: row.services.filter(isService),
    sector: row.sector === "public" ? "public" : "private",
    address: row.address,
    phone: opt(row.phone),
    website: opt(row.website),
    hours: opt(row.hours),
    accessNote: opt(row.access_note),
    accFunded: row.acc_funded,
    accepting: row.accepting,
    waitDays: opt(row.wait_days),
    waitIsEstimate: row.wait_is_estimate,
    feeNzd: opt(row.fee_nzd),
    priceNote: opt(row.price_note),
    sourceUrl: opt(row.source_url),
    updatedBy: opt(row.updated_by),
    updatedAt: row.updated_at,
  };
}

export function toReferral(row: Tables<"referrals">): Referral {
  return {
    id: row.id,
    patientId: row.patient_id,
    consultationId: opt(row.consultation_id),
    facilityId: row.facility_id,
    service: isService(row.service) ? row.service : "orthopaedics",
    urgency: (["routine", "soon", "urgent"].includes(row.urgency) ? row.urgency : "routine") as ReferralUrgency,
    reason: row.reason,
    letter: row.letter,
    status: (["sent", "acknowledged", "completed", "cancelled"].includes(row.status)
      ? row.status
      : "sent") as ReferralStatus,
    taskId: opt(row.task_id),
    createdBy: opt(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFacilities(supabase: Client) {
  const { data, error } = await supabase.from("referral_facilities").select("*").order("name").limit(500);
  if (error) throw new QueryError("Could not load the referral directory.");
  return data.map(toFacility);
}

export async function getFacility(supabase: Client, id: string) {
  const { data, error } = await supabase.from("referral_facilities").select("*").eq("id", id).maybeSingle();
  if (error) throw new QueryError("Could not load the facility.");
  return data ? toFacility(data) : null;
}

/** Availability edits; the database stamps who and when, and marks a changed wait as confirmed. */
export async function updateFacilityAvailability(
  supabase: Client,
  id: string,
  changes: { accepting: boolean; waitDays?: number; feeNzd?: number; priceNote?: string },
) {
  const { data, error } = await supabase
    .from("referral_facilities")
    .update({
      accepting: changes.accepting,
      wait_days: changes.waitDays ?? null,
      fee_nzd: changes.feeNzd ?? null,
      price_note: changes.priceNote ?? null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return toFacility(data);
}

export type ReferralWithNames = Referral & { patientName: string; facilityName: string };
type Joined = Tables<"referrals"> & {
  patients: { first_name: string; last_name: string } | null;
  referral_facilities: { name: string } | null;
};
const withNames = (row: Joined): ReferralWithNames => ({
  ...toReferral(row),
  patientName: row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : "Unknown patient",
  facilityName: row.referral_facilities?.name ?? "Unknown facility",
});
const JOINED = "*, patients(first_name, last_name), referral_facilities(name)";

export async function listReferrals(supabase: Client, options: { patientId?: string; limit?: number } = {}) {
  let query = supabase.from("referrals").select(JOINED).order("created_at", { ascending: false });
  if (options.patientId) query = query.eq("patient_id", options.patientId);
  const { data, error } = await query.limit(options.limit ?? 50);
  if (error) throw new QueryError("Could not load referrals.");
  return (data as unknown as Joined[]).map(withNames);
}

export async function getReferral(supabase: Client, id: string) {
  const { data, error } = await supabase.from("referrals").select(JOINED).eq("id", id).maybeSingle();
  if (error) throw new QueryError("Could not load the referral.");
  return data ? withNames(data as unknown as Joined) : null;
}

/** Saves the referral and a task to chase its acknowledgement, assigned to the referrer. */
export async function createReferral(
  supabase: Client,
  input: {
    patientId: string;
    consultationId?: string;
    facility: Pick<ReferralFacility, "id" | "name">;
    service: ReferralService;
    urgency: ReferralUrgency;
    reason: string;
    letter: string;
    referrerId: string;
  },
) {
  const chase = chaseTask(input.facility.name, input.urgency);
  const task = await createTask(supabase, {
    patientId: input.patientId,
    consultationId: input.consultationId,
    title: chase.title,
    details: `Referral: ${input.reason}`.slice(0, 1000),
    dueAt: chase.dueAt,
    assignedTo: input.referrerId,
  });
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      patient_id: input.patientId,
      consultation_id: input.consultationId ?? null,
      facility_id: input.facility.id,
      service: input.service,
      urgency: input.urgency,
      reason: input.reason,
      letter: input.letter,
      task_id: task?.id ?? null,
    })
    .select("*")
    .single();
  if (error || !data) {
    // Don't leave a chase task for a referral that was never saved.
    if (task) await updateTask(supabase, task.id, { status: "done" });
    return null;
  }
  return toReferral(data);
}

/** Moving past "sent" completes the chase task; moving back to "sent" reopens it. */
export async function setReferralStatus(supabase: Client, referral: Referral, status: ReferralStatus) {
  const { data, error } = await supabase
    .from("referrals")
    .update({ status })
    .eq("id", referral.id)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  if (referral.taskId) await updateTask(supabase, referral.taskId, { status: status === "sent" ? "open" : "done" });
  return toReferral(data);
}
