import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClinician } from "@/lib/auth";
import { getConsultation, getPatientRecord } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";
import { Recorder } from "@/components/consultation/recorder";
import { Transcript } from "@/components/consultation/transcript";

export const metadata = { title: "Consultation" };

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireClinician();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const consultation = await getConsultation(supabase, id.data);
  if (!consultation) notFound();
  const record = await getPatientRecord(supabase, consultation.patientId);
  const patientName = record
    ? `${record.patient.firstName} ${record.patient.lastName}`
    : "Unknown patient";
  const consultedAt = new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(consultation.date));

  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-10 lg:px-[30px]">
      <p className="text-body-2 mb-4">CONSULTATION</p>
      <h1 className="text-h2">
        <Link
          href={`/patients/${consultation.patientId}`}
          className="underline-offset-4 hover:underline"
        >
          {patientName}
        </Link>
      </h1>
      <p className="mt-4 text-sm text-charcoal">{consultedAt}</p>

      <div className="mt-10 space-y-8">
        {consultation.transcript ? (
          <>
            <Transcript text={consultation.transcript} />
            {/* WS04 replaces this with note generation and review. */}
            <section className="rounded-[20px] border border-dashed border-black/20 p-6">
              <h2 className="text-lg font-semibold">Clinical note</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal">
                Draft note generation is not available yet.
              </p>
            </section>
          </>
        ) : (
          <Recorder
            consultationId={consultation.id}
            audioSaved={Boolean(consultation.audioPath)}
          />
        )}
      </div>
    </main>
  );
}
