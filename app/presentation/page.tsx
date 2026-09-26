import Link from "next/link";

const slides = [
  {
    eyebrow: "Clinical consultation portal",
    title: "From fragmented notes to a safer, guided patient workflow.",
    text: "This portal helps clinicians move from a noisy consultation into a clear, reviewable patient record without losing accountability.",
    stats: [
      ["1", "secure clinician sign-in"],
      ["7", "core workflow stages"],
      ["0", "guesswork in final records"],
    ],
  },
  {
    eyebrow: "The need",
    title: "Consultations are still documented in a fragmented, high-risk way.",
    points: [
      "Clinicians are juggling patient conversation, documentation, follow-up actions, and admin tasks at once.",
      "Speech is often captured informally and then rewritten later in a manual note template.",
      "AI-generated drafts can speed up notes, but without review they create trust and accountability concerns.",
      "Patient record details are often spread across tools, messages, and after-the-fact notes.",
    ],
  },
  {
    eyebrow: "Why it matters",
    title: "Administrative overload is costing time and care quality.",
    cards: [
      {
        heading: "For clinicians",
        items: [
          "Less time writing notes after each consultation",
          "Lower cognitive load during patient conversation",
          "Faster access to a trusted patient timeline",
        ],
      },
      {
        heading: "For patients",
        items: [
          "More consistent care continuity",
          "Better follow-up plans and accuracy",
          "Fewer missed details and duplicate work",
        ],
      },
    ],
  },
  {
    eyebrow: "The portal",
    title: "A single guided workflow for patient consultations.",
    text: "This product gives clinicians a secure, structured path from patient lookup to finalised record.",
    points: [
      "Protected clinician login and session-based access",
      "Patient search and dashboard access",
      "Consultation recording and transcript capture",
      "AI-generated note draft with clear review steps",
      "Clinician finalisation into the patient timeline",
    ],
  },
  {
    eyebrow: "Demo flow",
    title: "What the user experiences in the portal.",
    steps: [
      ["1", "Login", "Secure sign-in for authorised clinicians."],
      ["2", "Find patient", "Open the patient dashboard and record."],
      ["3", "Record consult", "Capture the appointment and audio context."],
      ["4", "Transcribe", "Generate an accurate raw transcript."],
      ["5", "Draft note", "Create an AI-assisted clinical summary."],
      ["6", "Review", "Clinician checks and edits before approval."],
      ["7", "Finalise", "Save to the patient timeline."],
    ],
  },
  {
    eyebrow: "Why this is needed now",
    title: "Clinics are under pressure to do more with less time and fewer errors.",
    text: "Healthcare teams need a system that supports the clinician instead of creating another disconnected admin task.",
  },
  {
    eyebrow: "Closing",
    title: "We are not just automating admin. We are improving the quality of care delivery.",
    text: "The portal reduces the friction between a live consultation and the final patient record while keeping the clinician accountable for the final decision.",
  },
];

export const metadata = {
  title: "Portal presentation",
  description: "A short presentation explaining why the clinical portal is needed and how it works.",
};

export default function PresentationPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              Clinical consultation portal
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Why this product matters and how it works
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Open app
          </Link>
        </header>

        <div className="space-y-8">
          {slides.map((slide, slideIndex) => (
            <section
              key={slide.eyebrow + slideIndex}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/60 p-6 shadow-2xl shadow-sky-900/20 sm:p-8 lg:p-10"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                {slide.eyebrow}
              </p>

              <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl lg:text-6xl">
                {slide.title}
              </h1>

              {slide.text ? (
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  {slide.text}
                </p>
              ) : null}

              {slide.stats ? (
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {slide.stats.map(([value, label]) => (
                    <div
                      key={value + label}
                      className="rounded-2xl border border-white/10 bg-slate-800/60 p-5"
                    >
                      <div className="text-3xl font-semibold text-sky-200">{value}</div>
                      <div className="mt-2 text-sm text-slate-300">{label}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {slide.points ? (
                <ul className="mt-8 grid gap-4 md:grid-cols-2">
                  {slide.points.map((point) => (
                    <li
                      key={point}
                      className="rounded-2xl border border-white/10 bg-slate-800/50 p-4 text-base leading-7 text-slate-200"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}

              {slide.cards ? (
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  {slide.cards.map((card) => (
                    <div
                      key={card.heading}
                      className="rounded-2xl border border-white/10 bg-slate-800/50 p-5"
                    >
                      <h2 className="text-2xl font-semibold text-white">{card.heading}</h2>
                      <ul className="mt-4 space-y-3 text-slate-200">
                        {card.items.map((item) => (
                          <li key={item} className="flex gap-3 text-base leading-7">
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              {slide.steps ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {slide.steps.map(([stepNumber, title, detail]) => (
                    <div
                      key={stepNumber + title}
                      className="rounded-2xl border border-white/10 bg-slate-800/50 p-5"
                    >
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-200">
                        {stepNumber}
                      </div>
                      <div className="text-xl font-semibold text-white">{title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
