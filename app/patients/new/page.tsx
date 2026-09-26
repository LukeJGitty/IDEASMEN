import Link from "next/link";
import { createPatient } from "@/app/patients/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { requireClinician } from "@/lib/auth";

export default async function NewPatientPage() {
  await requireClinician();

  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-10 lg:px-[30px]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-charcoal">Patients</p>
          <h1 className="mt-2 text-3xl font-semibold">New patient</h1>
        </div>
        <Button asChild variant="outline" type="button">
          <Link href="/patients">Back to search</Link>
        </Button>
      </div>

      <form action={createPatient} className="space-y-5 rounded-[20px] border border-black/10 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-sm font-medium">First name</label>
            <input id="firstName" name="firstName" className={fieldClass} required />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-2 block text-sm font-medium">Last name</label>
            <input id="lastName" name="lastName" className={fieldClass} required />
          </div>
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="mb-2 block text-sm font-medium">Date of birth</label>
          <input id="dateOfBirth" name="dateOfBirth" type="date" className={fieldClass} required />
        </div>

        <div>
          <label htmlFor="nhi" className="mb-2 block text-sm font-medium">
            NHI number <span className="font-normal text-charcoal">(optional)</span>
          </label>
          <input id="nhi" name="nhi" placeholder="e.g. ZZZ0016" maxLength={9} autoCapitalize="characters" className={`${fieldClass} font-mono uppercase`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium">Phone</label>
            <input id="phone" name="phone" className={fieldClass} />
          </div>
        </div>

        <Button type="submit">Create patient</Button>
      </form>
    </main>
  );
}
