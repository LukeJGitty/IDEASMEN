import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { HippoLogo } from "@/components/shared/hippo-logo";

/** Shared top bar for every signed-in clinical page (patients and consultations). */
export function AppHeader({ email, openTasks = 0 }: { email: string; openTasks?: number }) {
  return (
    <header className="border-b border-hippo-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-[30px]">
        <nav aria-label="Main" className="flex flex-wrap items-center gap-5">
          <Link href="/patients" aria-label="Hippo home">
            <HippoLogo className="text-lg" />
          </Link>
          <Link href="/patients" className="text-sm font-medium text-hippo-900 underline-offset-4 hover:underline">
            Patients
          </Link>
          <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm font-medium text-hippo-900 underline-offset-4 hover:underline">
            Tasks
            {openTasks > 0 && (
              <span className="rounded-full bg-hippo-600 px-2 py-0.5 text-xs font-semibold text-white" aria-label={`${openTasks} open tasks assigned to you`}>
                {openTasks}
              </span>
            )}
          </Link>
          <Link href="/handover" className="text-sm font-medium text-hippo-900 underline-offset-4 hover:underline">
            Handover
          </Link>
          <Link href="/roster" className="text-sm font-medium text-hippo-900 underline-offset-4 hover:underline">
            Roster
          </Link>
          <Link href="/patients/new" className="text-sm font-medium text-hippo-900 underline-offset-4 hover:underline">
            New patient
          </Link>
        </nav>
        <form action="/patients" method="get" role="search" className="order-last w-full sm:order-none sm:w-auto">
          <label htmlFor="header-search" className="sr-only">
            Find a patient by name or NHI
          </label>
          <input
            id="header-search"
            name="q"
            placeholder="Find patient or NHI"
            className="w-full rounded-full border border-hippo-200 bg-hippo-50 px-4 py-1.5 text-sm placeholder:text-charcoal/60 focus-visible:outline-2 focus-visible:outline-hippo-600 sm:w-56"
          />
        </form>
        <div className="flex min-w-0 items-center gap-4">
          <span className="max-w-48 truncate text-sm text-charcoal">{email}</span>
          <form action={signOut}>
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
