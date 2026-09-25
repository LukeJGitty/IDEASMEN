import Link from "next/link";
import type { Consultation } from "@/types/consultation";

const statusClasses: Record<string, string> = {
  recording: "bg-slate-100 text-slate-700",
  uploading: "bg-amber-100 text-amber-700",
  transcribing: "bg-cyan-100 text-cyan-700",
  draft_generated: "bg-indigo-100 text-indigo-700",
  reviewing: "bg-violet-100 text-violet-700",
  finalised: "bg-emerald-100 text-emerald-700",
};

export function ConsultationTimeline({
  consultations,
}: {
  consultations: Consultation[];
}) {
  if (consultations.length === 0) {
    return (
      <section className="rounded-[20px] border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Consultation timeline</h2>
        <p className="mt-3 text-sm text-charcoal">No consultations recorded yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Consultation timeline</h2>
      <ol className="mt-4 space-y-4">
        {consultations.map((consultation) => {
          const summary = consultation.finalNote?.reasonForVisit
            || consultation.finalNote?.assessment
            || consultation.generatedDraft?.reasonForVisit
            || consultation.generatedDraft?.assessment
            || "Consultation note pending.";
          const isFinalised = consultation.status === "finalised";

          return (
            <li key={consultation.id} className="rounded-[20px] border border-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/consultations/${consultation.id}`} className="font-medium underline-offset-4 hover:underline">
                  {new Date(consultation.date).toLocaleString("en-NZ", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Link>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[consultation.status] ?? "bg-stone-100 text-stone-700"}`}>
                  {consultation.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-charcoal">{summary}</p>
              {!isFinalised ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-amber-700">
                  AI draft, not reviewed
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
