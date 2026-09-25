import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireClinician } from "@/lib/auth";
import { getConsultation } from "@/lib/data/queries";
import { idSchema } from "@/lib/validation";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireClinician();
  const consultationId = idSchema.safeParse((await params).id);
  if (!consultationId.success) notFound();
  const consultation = await getConsultation(supabase, consultationId.data);
  if (!consultation) notFound();

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 py-10 lg:px-[30px]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-charcoal">Consultation</p>
          <h1 className="mt-2 text-3xl font-semibold">{consultation.status}</h1>
        </div>
        <Button asChild variant="outline" type="button">
          <Link href={`/patients/${consultation.patientId}`}>Back to patient</Link>
        </Button>
      </div>

      <section className="rounded-[20px] border border-black/10 bg-white p-6">
        <p className="text-sm text-charcoal">
          Started {new Date(consultation.date).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-charcoal">
          <p>
            <span className="font-medium text-black">Status:</span> {consultation.status}
          </p>
          <p>
            <span className="font-medium text-black">Draft summary:</span> {consultation.generatedDraft?.reasonForVisit || "No AI note yet."}
          </p>
          <p>
            <span className="font-medium text-black">Final note:</span> {consultation.finalNote?.reasonForVisit || "Not finalised yet."}
          </p>
        </div>
      </section>
    </main>
  );
}
