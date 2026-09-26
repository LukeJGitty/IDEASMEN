"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, RotateCcw, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audioExtension, audioSchema } from "@/lib/validation";

type Phase = "idle" | "recording" | "recorded" | "uploading";
type Recording = { blob: Blob; url: string };

// Chrome and Firefox record WebM; Safari only records MP4.
const preferredTypes = ["audio/webm", "audio/mp4"];
// Speech needs little bandwidth. 32 kbps keeps a 15-minute consultation near 3.6 MB,
// under the 4.5 MB request limit on Vercel, with no loss in transcription quality.
const AUDIO_BITS_PER_SECOND = 32_000;

const formatElapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function microphoneError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is blocked. Allow the microphone for this site in your browser's address bar or settings, then try again.";
  if (name === "NotFoundError")
    return "No microphone was found. Connect one and try again.";
  if (name === "NotReadableError")
    return "The microphone is in use by another app. Close it and try again.";
  return "Recording could not start in this browser.";
}

export function Recorder({
  consultationId,
  audioSaved,
}: {
  consultationId: string;
  audioSaved: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording>();
  const [error, setError] = useState<string>();
  const recorderRef = useRef<MediaRecorder>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Release the microphone and the playback URL when leaving the page.
  useEffect(
    () => () => {
      stopTimer();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  useEffect(
    () => () => {
      if (recording) URL.revokeObjectURL(recording.url);
    },
    [recording],
  );

  async function start() {
    setError(undefined);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(
        "This browser cannot record audio. Use a recent Chrome, Edge, Firefox or Safari over HTTPS.",
      );
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      setError(microphoneError(cause));
      return;
    }
    const mimeType = preferredTypes.find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
      setRecording({ blob, url: URL.createObjectURL(blob) });
      setPhase("recorded");
    };
    recorderRef.current = recorder;
    recorder.start();
    const startedAt = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      250,
    );
    setPhase("recording");
  }

  function stop() {
    stopTimer();
    recorderRef.current?.stop();
  }

  function discard() {
    setRecording(undefined);
    setElapsed(0);
    setError(undefined);
    setPhase("idle");
  }

  async function submit(audio?: Blob) {
    if (audio) {
      const valid = audioSchema.safeParse(audio);
      if (!valid.success) {
        setError(valid.error.issues[0].message);
        return;
      }
    }
    setError(undefined);
    const previous = phase;
    setPhase("uploading");
    const body = new FormData();
    body.set("consultationId", consultationId);
    if (audio) body.set("audio", audio, `recording.${audioExtension(audio.type)}`);
    try {
      const response = await fetch("/api/transcribe", { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(
          response.status === 413
            ? "This recording is too long to upload here (about 18 minutes is the limit). Record the consultation in shorter parts."
            : (payload.error ?? "Transcription failed. Try again."),
        );
        setPhase(previous);
      }
    } catch {
      setError("The upload did not reach the server. Check your connection and try again.");
      setPhase(previous);
    }
    // Success shows the transcript; a provider failure shows the retry state.
    router.refresh();
  }

  const busy = phase === "uploading";

  if (audioSaved)
    return (
      <section className="rounded-[20px] bg-off-white p-6">
        <h2 className="text-lg font-semibold">Recording saved</h2>
        <p className="mt-2 text-sm leading-6 text-charcoal">
          The audio is stored, but it has not been transcribed yet.
        </p>
        <Status error={error} busy={busy} />
        <Button className="mt-6" onClick={() => submit()} disabled={busy}>
          <RotateCcw /> {busy ? "Transcribing…" : "Retry transcription"}
        </Button>
      </section>
    );

  return (
    <section className="rounded-[20px] bg-off-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Record consultation</h2>
        <span
          className="font-mono text-lg tabular-nums"
          aria-label={`Elapsed ${formatElapsed(elapsed)}`}
        >
          {phase === "recording" && (
            <Circle className="mr-2 inline size-3 fill-red-600 text-red-600" aria-hidden />
          )}
          {formatElapsed(elapsed)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-charcoal">
        Tell the patient you are recording. Audio is kept privately with the
        consultation.
      </p>

      {recording && phase !== "recording" && (
        <audio controls src={recording.url} className="mt-6 w-full" />
      )}
      <Status error={error} busy={busy} />

      <div className="mt-6 flex flex-wrap gap-3">
        {phase === "idle" && (
          <Button onClick={start}>
            <Circle /> Start recording
          </Button>
        )}
        {phase === "recording" && (
          <Button variant="destructive" onClick={stop}>
            <Square /> Stop
          </Button>
        )}
        {(phase === "recorded" || phase === "uploading") && recording && (
          <>
            <Button onClick={() => submit(recording.blob)} disabled={busy}>
              <Upload /> {busy ? "Uploading and transcribing…" : "Upload and transcribe"}
            </Button>
            <Button variant="outline" onClick={discard} disabled={busy}>
              <Trash2 /> Discard
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function Status({ error, busy }: { error?: string; busy: boolean }) {
  return (
    <p role="status" aria-live="polite" className="mt-4 text-sm leading-6">
      {error ? (
        <span className="text-red-600">{error}</span>
      ) : busy ? (
        "Working — this can take a moment for longer recordings."
      ) : null}
    </p>
  );
}
