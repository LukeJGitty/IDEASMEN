"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinician } from "@/lib/auth";
import {
  conditionSchema,
  consultationSchema,
  idSchema,
  medicationSchema,
  patientSchema,
} from "@/lib/validation";

const readString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

export async function createPatient(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const parsed = patientSchema.safeParse({
    firstName: readString(form.get("firstName")),
    lastName: readString(form.get("lastName")),
    dateOfBirth: readString(form.get("dateOfBirth")),
    email: readString(form.get("email")),
    phone: readString(form.get("phone")),
    nhi: readString(form.get("nhi")),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { data, error } = await supabase
    .from("patients")
    .insert({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      date_of_birth: parsed.data.dateOfBirth,
      email: parsed.data.email,
      phone: parsed.data.phone,
      nhi: parsed.data.nhi ?? null,
    })
    .select("id")
    .single();
  if (error?.code === "23505") throw new Error("A patient with this NHI already exists.");
  if (error || !data) throw new Error("Could not create this patient.");
  revalidatePath("/patients");
  redirect(`/patients/${data.id}`);
}

export async function updatePatient(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const patientId = idSchema.safeParse(form.get("id"));
  if (!patientId.success) throw new Error("This patient could not be found.");
  const parsed = patientSchema.safeParse({
    firstName: readString(form.get("firstName")),
    lastName: readString(form.get("lastName")),
    dateOfBirth: readString(form.get("dateOfBirth")),
    email: readString(form.get("email")),
    phone: readString(form.get("phone")),
    nhi: readString(form.get("nhi")),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { data, error } = await supabase
    .from("patients")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      date_of_birth: parsed.data.dateOfBirth,
      email: parsed.data.email,
      phone: parsed.data.phone,
      nhi: parsed.data.nhi ?? null,
    })
    .eq("id", patientId.data)
    .select("id")
    .single();
  if (error?.code === "23505") throw new Error("Another patient already has this NHI.");
  if (error || !data) throw new Error("Could not update this patient.");
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId.data}`);
  redirect(`/patients/${patientId.data}`);
}

export async function createMedication(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const patientId = idSchema.safeParse(form.get("patientId"));
  if (!patientId.success) throw new Error("This patient could not be found.");
  const parsed = medicationSchema.safeParse({
    patientId: patientId.data,
    name: readString(form.get("name")),
    dose: readString(form.get("dose")),
    frequency: readString(form.get("frequency")),
    route: readString(form.get("route")),
    startDate: readString(form.get("startDate")),
    endDate: readString(form.get("endDate")),
    status: form.get("status") ?? "active",
    notes: readString(form.get("notes")),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { error } = await supabase.from("medications").insert({
    patient_id: patientId.data,
    name: parsed.data.name,
    dose: parsed.data.dose,
    frequency: parsed.data.frequency,
    route: parsed.data.route,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    status: parsed.data.status,
    notes: parsed.data.notes,
  });
  if (error) throw new Error("Could not add this medication.");
  revalidatePath(`/patients/${patientId.data}`);
  redirect(`/patients/${patientId.data}`);
}

export async function stopMedication(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse(form.get("id"));
  const patientId = idSchema.safeParse(form.get("patientId"));
  if (!id.success || !patientId.success)
    throw new Error("This medication could not be found.");
  const { error } = await supabase
    .from("medications")
    .update({ status: "stopped" })
    .eq("id", id.data)
    .eq("patient_id", patientId.data);
  if (error) throw new Error("Could not stop this medication.");
  revalidatePath(`/patients/${patientId.data}`);
  redirect(`/patients/${patientId.data}`);
}

export async function createCondition(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const patientId = idSchema.safeParse(form.get("patientId"));
  if (!patientId.success) throw new Error("This patient could not be found.");
  const parsed = conditionSchema.safeParse({
    patientId: patientId.data,
    condition: readString(form.get("condition")),
    diagnosedDate: readString(form.get("diagnosedDate")),
    status: form.get("status") ?? "active",
    notes: readString(form.get("notes")),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { error } = await supabase.from("medical_conditions").insert({
    patient_id: patientId.data,
    condition: parsed.data.condition,
    diagnosed_date: parsed.data.diagnosedDate,
    status: parsed.data.status,
    notes: parsed.data.notes,
  });
  if (error) throw new Error("Could not add this condition.");
  revalidatePath(`/patients/${patientId.data}`);
  redirect(`/patients/${patientId.data}`);
}

export async function resolveCondition(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse(form.get("id"));
  const patientId = idSchema.safeParse(form.get("patientId"));
  if (!id.success || !patientId.success)
    throw new Error("This condition could not be found.");
  const { error } = await supabase
    .from("medical_conditions")
    .update({ status: "resolved" })
    .eq("id", id.data)
    .eq("patient_id", patientId.data);
  if (error) throw new Error("Could not resolve this condition.");
  revalidatePath(`/patients/${patientId.data}`);
  redirect(`/patients/${patientId.data}`);
}

export async function createConsultation(form: FormData): Promise<void> {
  const { supabase } = await requireClinician();
  const parsed = consultationSchema.safeParse({
    patientId: form.get("patientId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { data, error } = await supabase
    .from("consultations")
    .insert({ patient_id: parsed.data.patientId })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not start this consultation.");
  revalidatePath(`/patients/${parsed.data.patientId}`);
  redirect(`/consultations/${data.id}`);
}
