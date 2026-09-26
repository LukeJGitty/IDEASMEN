import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { QueryError } from "@/lib/data/queries";
import type { RosterShift, StaffRole } from "@/types/roster";

type Client = SupabaseClient<Database>;
const ROLES: StaffRole[] = ["doctor", "nurse", "reception", "other"];

export function toRosterShift(row: Tables<"roster_shifts">): RosterShift {
  return {
    id: row.id,
    staffName: row.staff_name,
    role: ROLES.includes(row.role as StaffRole) ? (row.role as StaffRole) : "other",
    area: row.area,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes ?? undefined,
  };
}

/** Shifts overlapping [from, to). */
export async function listShifts(supabase: Client, from: Date, to: Date) {
  const { data, error } = await supabase
    .from("roster_shifts")
    .select("*")
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at")
    .limit(500);
  if (error) throw new QueryError("Could not load the roster.");
  return data.map(toRosterShift);
}

export async function createShift(
  supabase: Client,
  shift: Omit<RosterShift, "id">,
) {
  const { error } = await supabase.from("roster_shifts").insert({
    staff_name: shift.staffName,
    role: shift.role,
    area: shift.area,
    starts_at: shift.startsAt,
    ends_at: shift.endsAt,
    notes: shift.notes || null,
  });
  return !error;
}

export async function deleteShift(supabase: Client, id: string) {
  const { error } = await supabase.from("roster_shifts").delete().eq("id", id);
  return !error;
}
