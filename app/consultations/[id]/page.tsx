import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClinician } from "@/lib/auth";
import { getConsultation, getPatientRecord } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";
import { Recorder } from "@/components/consultation/recorder";
import { Transcript } from "@/components/consultation/transcript";
import { NoteStep } from "@/components/consultation/note-step";
import { getClinicianName } from "@/lib/data/notes";

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
  const [record, finalisedByName] = await Promise.all([
    getPatientRecord(supabase, consultation.patientId),
    getClinicianName(supabase, consultation.finalisedBy),
  ]);
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
            <section aria-labelledby="note-heading">
              <h2 id="note-heading" className="mb-4 text-lg font-semibold">
                Clinical note
              </h2>
              <NoteStep
                consultation={consultation}
                finalisedByName={finalisedByName}
              />
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
