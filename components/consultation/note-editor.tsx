"use client";
import { useActionState, useState } from "react";
import {
  finaliseConsultation,
  saveNoteAction,
  type NoteFormState,
} from "@/app/consultations/note-actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { NOTE_FIELDS, fieldValue } from "@/lib/notes/form";
import { formatDue, suggestTasks, type TaskSuggestion } from "@/lib/tasks/logic";
import type { ClinicalNote } from "@/types/consultation";

const same = (a: string, b: string) => a.trim() === b.trim();

/** WS04 task 3: one field per ClinicalNote key, pre-filled, with a persistent AI-draft banner. */
export function NoteEditor({
  consultationId,
  draft,
  initial,
}: {
  consultationId: string;
  draft: ClinicalNote;
  initial: ClinicalNote;
}) {
  const [saveState, saveAction, saving] = useActionState<NoteFormState, FormData>(
    saveNoteAction,
    {},
  );
  const [finaliseState, finaliseAction, finalising] = useActionState<NoteFormState, FormData>(
    finaliseConsultation,
    {},
  );
  const [values, setValues] = useState(() =>
    Object.fromEntries(NOTE_FIELDS.map(({ key }) => [key, fieldValue(initial, key)])),
  );
  const [confirming, setConfirming] = useState(false);
  // Worked out when the clinician opens the finalise step, from the plan as edited.
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const openConfirm = () => {
    setSuggestions(suggestTasks({ plan: values.plan, followUp: values.followUp }));
    setConfirming(true);
  };
  const busy = saving || finalising;
  const edited = NOTE_FIELDS.filter(({ key }) => !same(values[key], fieldValue(draft, key)));
  const message = finaliseState.error || saveState.error || finaliseState.success || saveState.success;
  const isError = Boolean(finaliseState.error || saveState.error);

  return (
    <form className="space-y-6">
      <input type="hidden" name="consultationId" value={consultationId} />
      <div
        role="note"
        className="rounded-[20px] border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6"
      >
        <p className="font-semibold">AI draft — review before finalising</p>
        <p className="text-charcoal">
          Generated from the transcript. Check every field against what was said.{" "}
          {edited.length === 0
            ? "No fields edited yet."
            : `${edited.length} of ${NOTE_FIELDS.length} fields edited by you.`}
        </p>
      </div>

      {NOTE_FIELDS.map(({ key, label, rows, max }) => {
        const changed = !same(values[key], fieldValue(draft, key));
        return (
          <div key={key}>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`note-${key}`} className="text-sm font-medium">
                {label}
              </label>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  changed ? "bg-blue/10 text-blue" : "bg-off-white text-charcoal/70"
                }`}
              >
                {changed ? "Edited" : "AI draft"}
              </span>
            </div>
            <textarea
              id={`note-${key}`}
              name={key}
              rows={rows}
              maxLength={max}
              value={values[key]}
              onChange={(event) => setValues((v) => ({ ...v, [key]: event.target.value }))}
              placeholder="Not mentioned in the transcript"
              className={`${fieldClass} mt-2 resize-y text-sm leading-6`}
              disabled={busy}
            />
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-6">
        <Button type="submit" variant="outline" formAction={saveAction} disabled={busy}>
          {saving ? "Saving…" : "Save review"}
        </Button>
        {!confirming && (
          <Button type="button" onClick={openConfirm} disabled={busy}>
            Finalise note…
          </Button>
        )}
      </div>

      {confirming && (
        <div className="rounded-[20px] border border-black/15 bg-off-white p-5">
          <p className="font-semibold">Finalise this note?</p>
          <p className="mt-1 text-sm leading-6 text-charcoal">
            The note is saved exactly as shown above and locked. It can’t be edited afterwards, and
            you’ll be recorded as the finalising clinician. The original AI draft is kept unchanged.
          </p>
          {suggestions.length > 0 && (
            <fieldset className="mt-4 rounded-2xl border border-hippo-200 bg-white p-4">
              <legend className="px-1 text-sm font-semibold">Follow-up tasks from the plan</legend>
              <p className="mb-3 text-xs text-charcoal">
                Ticked tasks are added to Tasks and assigned to you. Untick any you don’t need.
              </p>
              <ul className="space-y-2">
                {suggestions.map((task) => (
                  <li key={task.title}>
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        name="suggestedTask"
                        value={JSON.stringify(task)}
                        defaultChecked
                        className="mt-1 size-4"
                        disabled={busy}
                      />
                      <span>
                        {task.title}
                        <span className="block text-xs text-charcoal/70">
                          {task.dueAt ? `Due ${formatDue(task.dueAt)}` : "No due date"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="confirmReviewed"
              required
              className="mt-1 size-4"
              disabled={busy}
            />
            I have reviewed every field and this note is accurate.
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" formAction={finaliseAction} disabled={busy}>
              {finalising ? "Finalising…" : "Confirm and finalise"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p aria-live="polite" role={isError ? "alert" : "status"} className="text-sm leading-6">
        {message}
      </p>
    </form>
  );
}
