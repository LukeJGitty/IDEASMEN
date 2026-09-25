import Link from "next/link";
import { notFound } from "next/navigation";
import { signOut } from "@/app/login/actions";
import {
  createConsultation,
  updatePatient,
} from "@/app/patients/actions";
import { ConditionList } from "@/components/patients/condition-list";
import { ConsultationTimeline } from "@/components/patients/consultation-timeline";
import { MedicationList } from "@/components/patients/medication-list";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { requireClinician } from "@/lib/auth";
import { getPatientRecord, listConsultations } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";

export default async function PatientDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, email } = await requireClinician();
  const patientId = idSchema.safeParse((await params).id);
  if (!patientId.success) notFound();

  const record = await getPatientRecord(supabase, patientId.data);
  if (!record) notFound();
  const consultations = await listConsultations(supabase, patientId.data);

  return (
    <>
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-[30px]">
          <div className="flex items-center gap-3">
            <Link href="/patients" className="font-semibold">
              IDEASMEN / Patients
            </Link>
            <Link href="/" className="text-sm text-charcoal underline-offset-4 hover:underline">
              Home
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-4">
            <span className="max-w-48 truncate text-sm text-charcoal">{email}</span>
            <form action={signOut}>
              <Button variant="ghost" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-[30px]">
        <section className="rounded-[24px] border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-charcoal">Patient record</p>
              <h1 className="mt-3 text-3xl font-semibold">
                {record.patient.firstName} {record.patient.lastName}
              </h1>
            </div>
            <form action={createConsultation}>
              <input type="hidden" name="patientId" value={record.patient.id} />
              <Button type="submit">New consultation</Button>
            </form>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-charcoal">Date of birth</p>
              <p className="mt-2 text-base font-medium">
                {new Date(record.patient.dateOfBirth).toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-charcoal">Email</p>
              <p className="mt-2 text-base font-medium">{record.patient.email ?? "Not recorded"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-charcoal">Phone</p>
              <p className="mt-2 text-base font-medium">{record.patient.phone ?? "Not recorded"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-black/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Update patient</h2>
            <Link href="/patients" className="text-sm underline-offset-4 hover:underline">
              Back to search
            </Link>
          </div>
          <form action={updatePatient} className="space-y-4">
            <input type="hidden" name="id" value={record.patient.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="mb-2 block text-sm font-medium">First name</label>
                <input id="firstName" name="firstName" defaultValue={record.patient.firstName} className={fieldClass} required />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-2 block text-sm font-medium">Last name</label>
                <input id="lastName" name="lastName" defaultValue={record.patient.lastName} className={fieldClass} required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="dateOfBirth" className="mb-2 block text-sm font-medium">Date of birth</label>
                <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={record.patient.dateOfBirth} className={fieldClass} required />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
                <input id="email" name="email" type="email" defaultValue={record.patient.email ?? ""} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium">Phone</label>
                <input id="phone" name="phone" defaultValue={record.patient.phone ?? ""} className={fieldClass} />
              </div>
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <MedicationList patientId={record.patient.id} medications={record.medications} />
          <ConditionList patientId={record.patient.id} conditions={record.conditions} />
        </div>

        <ConsultationTimeline consultations={consultations} />
      </main>
    </>
  );
}
