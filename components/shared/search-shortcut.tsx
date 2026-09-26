"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const SEARCH_ID = "header-search";

function focusSearch() {
  const input = document.getElementById(SEARCH_ID) as HTMLInputElement | null;
  input?.focus();
  input?.select();
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Press "/" (or Ctrl/Cmd + K) anywhere to jump to the patient and NHI search. */
export function SearchShortcut() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const commandK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if ((slash && !isTyping(event.target)) || commandK) {
        event.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

/** Dashboard quick action that does the same as pressing "/". */
export function FocusSearchButton() {
  return (
    <Button type="button" onClick={focusSearch}>
      Find patient or NHI
      <kbd className="rounded border border-white/40 px-1.5 text-xs font-normal">/</kbd>
    </Button>
  );
}
