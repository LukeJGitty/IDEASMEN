"use client";
import { useActionState } from "react";
import { generateDraftAction, type NoteFormState } from "@/app/consultations/note-actions";
import { Button } from "@/components/ui/button";

export function GenerateDraft({ consultationId }: { consultationId: string }) {
  const [state, action, pending] = useActionState<NoteFormState, FormData>(
    generateDraftAction,
    {},
  );
  return (
    <form action={action} className="rounded-[20px] border border-dashed border-black/20 px-6 py-10">
      <input type="hidden" name="consultationId" value={consultationId} />
      <p className="text-lg font-semibold">Turn the transcript into a note</p>
      <p className="mt-2 max-w-prose text-sm leading-6 text-charcoal">
        The AI drafts each section from the transcript and leaves out anything that wasn’t said.
        You review and edit it before anything is final.
      </p>
      <Button type="submit" className="mt-6" disabled={pending}>
        {pending ? "Generating draft…" : "Generate AI draft"}
      </Button>
      <p aria-live="polite" role={state.error ? "alert" : "status"} className="mt-3 text-sm">
        {state.error || state.success}
      </p>
    </form>
  );
}
