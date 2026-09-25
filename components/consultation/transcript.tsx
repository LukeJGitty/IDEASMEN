export function Transcript({ text }: { text: string }) {
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
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-charcoal">
        {text}
      </p>
    </section>
  );
}
