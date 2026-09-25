import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

/** Shared top bar for every signed-in clinical page (patients and consultations). */
export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-[30px]">
        <nav aria-label="Main" className="flex flex-wrap items-center gap-5">
          <Link href="/patients" className="font-semibold">
            IDEASMEN
          </Link>
          <Link href="/patients" className="text-sm text-charcoal underline-offset-4 hover:underline">
            Patients
          </Link>
          <Link href="/patients/new" className="text-sm text-charcoal underline-offset-4 hover:underline">
            New patient
          </Link>
        </nav>
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
