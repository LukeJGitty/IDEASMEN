"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNzTime } from "@/lib/time";

type Table = "tasks" | "consultations" | "roster_shifts" | "patients";

const FALLBACK_MS = 60_000; // in case realtime is unavailable, refresh once a minute

/**
 * Keeps a server-rendered page current without reloading: re-renders it when anyone
 * changes one of `tables` (Supabase Realtime, filtered by RLS), when the tab regains
 * focus, and once a minute as a fallback. Form input and scroll position are kept.
 * `renderedAt` is the server render time, so it updates with every refresh.
 */
export function LiveRefresh({ tables, renderedAt }: { tables: Table[]; renderedAt: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const key = tables.join(",");

  useEffect(() => {
    const refresh = () => {
      clearTimeout(pending.current);
      // Batch bursts of changes (for example, finalising a note that creates tasks).
      pending.current = setTimeout(() => router.refresh(), 400);
    };

    const supabase = createClient();
    let channel = supabase.channel(`live:${key}:${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(",") as Table[])
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, FALLBACK_MS);

    return () => {
      clearTimeout(pending.current);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [key, router]);

  return (
    <p className="inline-flex items-center gap-2 text-xs text-charcoal/80 print:hidden" aria-live="off">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-hippo-300"}`}
      />
      {live ? "Live" : "Auto-refresh"}
      <span className="text-charcoal/60" suppressHydrationWarning>· updated {formatNzTime(renderedAt)}</span>
    </p>
  );
}
