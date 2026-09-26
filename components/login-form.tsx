"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { getDevCode } from "@/app/login/dev-code";
import { requestCode, verifyCode } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

/**
 * Email-code sign-in. With `devCodes` (local development only), the code is fetched from
 * the local test inbox as soon as it is sent, shown in a pop-up, sent as a desktop
 * notification and filled in, so nobody has to open the inbox.
 */
export function LoginForm({ devCodes = false }: { devCodes?: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [sent, send, sending] = useActionState(requestCode, {});
  const [verified, verify, verifying] = useActionState(verifyCode, {});
  const requestedAt = useRef<string>("");
  const codeInput = useRef<HTMLInputElement>(null);
  const signInButton = useRef<HTMLButtonElement>(null);

  // Ask for notification permission on the click (browsers only allow it on a gesture).
  const onSend = () => {
    requestedAt.current = new Date().toISOString();
    setDevCode(undefined);
    setCode("");
    if (devCodes && typeof Notification !== "undefined" && Notification.permission === "default")
      void Notification.requestPermission();
  };

  useEffect(() => {
    if (sent.success) codeInput.current?.focus();
  }, [sent]);

  // Poll the local inbox for up to ~30 seconds after a code is sent.
  useEffect(() => {
    if (!devCodes || !sent.success || !sent.email || !requestedAt.current) return;
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const target = sent.email;
    const since = requestedAt.current;
    const poll = async () => {
      if (cancelled) return;
      const { code: found } = await getDevCode(target, since).catch(() => ({ code: undefined }));
      if (cancelled) return;
      if (found) {
        setDevCode(found);
        setCode(found);
        signInButton.current?.focus();
        if (typeof Notification !== "undefined" && Notification.permission === "granted")
          new Notification("Your Hippo sign-in code", { body: found, tag: "hippo-code" });
        return;
      }
      if (++tries < 20) timer = setTimeout(poll, 1500);
    };
    timer = setTimeout(poll, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [devCodes, sent]);

  return (
    <div className="space-y-6">
      <form action={send} onSubmit={onSend} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <div className="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
              placeholder="you@clinic.co.nz"
            />
          </div>
        </div>
        <Button type="submit" size="xl" disabled={sending || verifying} className="w-full">
          {sending ? "Sending code…" : sent.success ? "Send a new code" : "Email me a code"}
        </Button>
        <p aria-live="polite" className="text-sm leading-6">
          {sent.error || sent.success}
        </p>
      </form>

      {sent.success && devCode && (
        <div
          role="status"
          className="rounded-2xl border border-hippo-300 bg-hippo-50 p-4 shadow-sm"
        >
          <p className="text-xs font-semibold tracking-[0.08em] text-hippo-900/70 uppercase">
            Code received
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.3em] text-hippo-900">{devCode}</p>
          <p className="mt-2 text-xs leading-5 text-charcoal">
            Filled in for you. This shortcut only appears while Hippo runs on your own computer;
            on the live site the code arrives by email.
          </p>
        </div>
      )}

      {sent.success && (
        <form action={verify} className="space-y-4 border-t border-hippo-200 pt-6">
          <input type="hidden" name="email" value={sent.email} />
          <div>
            <label htmlFor="code" className="text-sm font-medium">
              Sign-in code
            </label>
            <div className="mt-2">
              <input
                ref={codeInput}
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="[0-9]{6,10}"
                minLength={6}
                maxLength={10}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                className={`${fieldClass} font-mono tracking-[0.2em]`}
                aria-describedby="code-help"
              />
            </div>
            <p id="code-help" className="mt-2 text-sm text-charcoal">
              {devCodes && !devCode
                ? `Waiting for the code sent to ${sent.email}…`
                : `Use the code sent to ${sent.email}.`}
            </p>
          </div>
          <Button ref={signInButton} type="submit" disabled={verifying || sending} size="xl" className="w-full">
            {verifying ? "Signing in…" : "Sign in to Hippo"}
          </Button>
          <p role="alert" className="text-sm">
            {verified.error}
          </p>
        </form>
      )}
      <p className="text-xs leading-5 text-charcoal/80">
        You stay signed in on this device until you choose Sign out.
      </p>
    </div>
  );
}
