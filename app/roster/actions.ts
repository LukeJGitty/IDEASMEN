"use server";
import { revalidatePath } from "next/cache";
import { requireClinician } from "@/lib/auth";
import { createShift, deleteShift } from "@/lib/data/roster";
import { nzLocalToIso } from "@/lib/time";
import { idSchema, rosterShiftSchema } from "@/lib/validation";

export type ShiftFormState = { error?: string; success?: string };

export async function addShiftAction(_: ShiftFormState, form: FormData): Promise<ShiftFormState> {
  const { supabase } = await requireClinician();
  const parsed = rosterShiftSchema.safeParse({
    staffName: form.get("staffName") ?? "",
    role: form.get("role"),
    area: form.get("area") ?? "",
    date: form.get("date") ?? "",
    start: form.get("start") ?? "",
    end: form.get("end") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the shift details." };
  const { staffName, role, area, date, start, end } = parsed.data;
  const startsAt = nzLocalToIso(date, start);
  let endsAt = nzLocalToIso(date, end);
  // An end time earlier than the start is an overnight shift ending the next day.
  if (endsAt <= startsAt) endsAt = new Date(Date.parse(endsAt) + 86_400_000).toISOString();
  const ok = await createShift(supabase, { staffName, role, area, startsAt, endsAt });
  if (!ok) return { error: "Couldn’t add the shift. Try again." };
  revalidatePath("/roster");
  revalidatePath("/handover");
  return { success: `Added ${staffName}.` };
}

export async function removeShiftAction(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse(form.get("shiftId"));
  if (!id.success) return;
  await deleteShift(supabase, id.data);
  revalidatePath("/roster");
  revalidatePath("/handover");
}
