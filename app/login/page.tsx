import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { HippoLogo, HippoMark } from "@/components/shared/hippo-logo";
import { SetupNotice } from "@/components/setup-notice";
import { isConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };
export default async function LoginPage() {
  const configured = isConfigured();
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims.sub) redirect("/patients");
  }
  return (
    <main
      id="main"
      className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]"
    >
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-hippo-100 via-hippo-200 to-hippo-300 px-6 py-8 lg:px-12 lg:py-12">
        <HippoLogo className="text-xl" markClassName="size-10" />
        <div className="my-12 max-w-lg lg:my-0">
          <h1 className="text-h2 text-hippo-900">
            You talk to your patient. Hippo writes the note.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-hippo-900/80">
            Record the consultation, get an accurate transcript, and review an
            AI-drafted clinical note before anything is saved to the record.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-hippo-900">
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-hippo-600" />
              Every AI draft stays a draft until a clinician finalises it.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-hippo-600" />
              One shared patient timeline for the whole care team.
            </li>
          </ul>
        </div>
        <HippoMark className="pointer-events-none absolute -right-10 -bottom-10 hidden size-72 opacity-25 lg:block" />
        <p className="relative text-xs text-hippo-900/70">
          Demo environment. Fictional patient data only.
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <h2 className="text-h3 text-hippo-900">Sign in</h2>
          <p className="mt-3 mb-8 text-sm leading-6 text-charcoal">
            We’ll email you a code. No password needed.
          </p>
          {configured ? <LoginForm /> : <SetupNotice />}
        </div>
      </section>
    </main>
  );
}
