import { cn } from "@/lib/utils";

/** Hippo's mark: a friendly front-on hippo head. Original artwork, safe to reuse. */
export function HippoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      {/* ears */}
      <circle cx="17" cy="13" r="6" fill="#5bb4ea" />
      <circle cx="47" cy="13" r="6" fill="#5bb4ea" />
      <circle cx="17" cy="13" r="2.6" fill="#b9e1f9" />
      <circle cx="47" cy="13" r="2.6" fill="#b9e1f9" />
      {/* head */}
      <ellipse cx="32" cy="26" rx="19" ry="15" fill="#5bb4ea" />
      {/* muzzle */}
      <rect x="7" y="27" width="50" height="31" rx="15.5" fill="#8fcff5" />
      {/* eyes */}
      <circle cx="24.5" cy="22" r="3" fill="#0c4a6e" />
      <circle cx="39.5" cy="22" r="3" fill="#0c4a6e" />
      <circle cx="25.5" cy="21" r="0.9" fill="#ffffff" />
      <circle cx="40.5" cy="21" r="0.9" fill="#ffffff" />
      {/* nostrils and smile */}
      <ellipse cx="22" cy="38" rx="3" ry="4" fill="#0c4a6e" />
      <ellipse cx="42" cy="38" rx="3" ry="4" fill="#0c4a6e" />
      <path
        d="M24 49 Q32 54 40 49"
        fill="none"
        stroke="#0c4a6e"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark plus wordmark, for headers and the sign-in page. */
export function HippoLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-hippo-900", className)}>
      <HippoMark className={markClassName} />
      <span>Hippo</span>
    </span>
  );
}
