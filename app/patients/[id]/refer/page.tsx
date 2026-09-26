import Link from "next/link";
import { notFound } from "next/navigation";
import { ReferralBuilder } from "@/components/referrals/referral-builder";
import { requireClinician } from "@/lib/auth";
import { getPatientRecord, listConsultations } from "@/lib/data/queries";
import { listFacilities } from "@/lib/data/referrals";
import { suggestServices } from "@/lib/referrals/logic";
import { idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Make a referral" };
// Drafting the letter with AI can take a while; allow up to 2 minutes on Vercel.
export const maxDuration = 120;

export default async function ReferPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireClinician();
  const patientId = idSchema.safeParse((await params).id);
  if (!patientId.success) notFound();
  const [record, consultations, facilities] = await Promise.all([
    getPatientRecord(supabase, patientId.data),
    listConsultations(supabase, patientId.data),
    listFacilities(supabase),
  ]);
  if (!record) notFound();
  const latest = consultations.find((c) => c.finalNote || c.generatedDraft);
  const note = latest?.finalNote ?? latest?.generatedDraft;
  const { patient } = record;

  return (
    <main id="main" className="mx-auto max-w-4xl space-y-8 px-5 py-10 lg:px-[30px]">
      <div>
        <Link href={`/patients/${patient.id}`} className="text-sm text-hippo-600 hover:underline">
          ← {patient.firstName} {patient.lastName}
        </Link>
        <h1 className="text-h2 mt-3 text-hippo-900">Make a referral</h1>
        <p className="mt-2 text-sm text-charcoal">
          {patient.firstName} {patient.lastName}
          {patient.nhi ? ` · NHI ${patient.nhi}` : ""}
          {latest ? ` · using the note from ${new Date(latest.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : " · no consultation note yet"}
        </p>
      </div>
      <ReferralBuilder
        patientId={patient.id}
        consultationId={latest?.id}
        facilities={facilities}
        suggested={suggestServices(note)}
        defaultReason={note?.assessment || note?.reasonForVisit || ""}
      />
    </main>
  );
}
