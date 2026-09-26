export function Transcript({ text, sample = false }: { text: string; sample?: boolean }) {
  return (
    <section aria-labelledby="transcript-heading">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-black/10 pb-4">
        <h2 id="transcript-heading" className="text-lg font-semibold">
          Raw transcript
        </h2>
        <span className="rounded-full bg-off-white px-3 py-1 text-xs font-medium">
          Read-only
        </span>
      </div>
      {sample && (
        <p role="note" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6">
          <strong>Sample transcript, not your recording.</strong> Hippo’s offline demo transcriber was on when
          this was recorded. Once real transcription is switched on, start a new consultation to record again.
        </p>
      )}
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-charcoal">
        {text}
      </p>
    </section>
  );
}
