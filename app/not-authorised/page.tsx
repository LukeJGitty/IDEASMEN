import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Not authorised" };
export default function NotAuthorised() {
  return (
    <main id="main" className="grid-container py-24">
      <p className="text-body-2">403</p>
      <h1 className="text-h2 my-6">Clinician access required.</h1>
      <p className="mb-6 max-w-prose">
        Your account is signed in but has not been authorised to view patient
        records. Ask an administrator to enable clinician access.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <form action={signOut}>
          <Button type="submit">Sign out</Button>
        </form>
        <Link href="/" className="underline">
          Back to the start
        </Link>
      </div>
    </main>
  );
}
