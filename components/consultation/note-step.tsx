import { GenerateDraft } from "@/components/consultation/generate-draft";
import { NoteEditor } from "@/components/consultation/note-editor";
import { NOTE_FIELDS, fieldValue } from "@/lib/notes/form";
import type { ClinicalNote, Consultation } from "@/types/consultation";

const formatWhen = (iso: string) =>
  new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(iso));

function NoteView({ note }: { note: ClinicalNote }) {
  return (
    <dl className="space-y-5">
      {NOTE_FIELDS.map(({ key, label }) => {
        const value = fieldValue(note, key);
        return (
          <div key={key}>
            <dt className="text-sm font-medium">{label.replace(" (one per line)", "")}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-charcoal">
              {value || <span className="text-charcoal/50">Not recorded</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * The note step of the consultation workspace (WS04). WS03's workspace page can render
 * this directly: <NoteStep consultation={c} finalisedByName={name} />.
 */
export function NoteStep({
  consultation,
  finalisedByName,
}: {
  consultation: Consultation;
  finalisedByName?: string;
}) {
  const { id, transcript, generatedDraft, finalNote, status } = consultation;

  if (status === "finalised" && finalNote) {
    return (
      <section aria-labelledby="final-note-heading" className="space-y-6">
        <div className="rounded-[20px] border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm leading-6">
          <p id="final-note-heading" className="font-semibold">
            Final note
          </p>
          <p className="text-charcoal">
            Finalised by {finalisedByName || "a clinician"}
            {consultation.finalisedAt ? ` on ${formatWhen(consultation.finalisedAt)}` : ""}. Read-only.
          </p>
        </div>
        <NoteView note={finalNote} />
        {generatedDraft && (
          <details className="rounded-[20px] border border-black/10 p-5">
            <summary className="cursor-pointer text-sm font-medium">
              Original AI draft (kept unchanged)
            </summary>
            <div className="mt-5">
              <NoteView note={generatedDraft} />
            </div>
          </details>
        )}
      </section>
    );
  }

  if (generatedDraft) {
    return (
      <NoteEditor consultationId={id} draft={generatedDraft} initial={finalNote ?? generatedDraft} />
    );
  }

  if (transcript?.trim()) return <GenerateDraft consultationId={id} />;

  return (
    <div className="rounded-[20px] border border-dashed border-black/20 px-6 py-10 text-sm leading-6 text-charcoal">
      The note can be drafted once the consultation has a transcript.
    </div>
  );
}
