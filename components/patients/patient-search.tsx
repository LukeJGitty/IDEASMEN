import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import type { Patient } from "@/types/patient";

export function PatientSearch({
  query,
  patients,
  error,
}: {
  query: string;
  patients: Patient[];
  error?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Patient search</h1>
        <Button asChild type="button">
          <Link href="/patients/new">New patient</Link>
        </Button>
      </div>
      <form action="/patients" method="get" className="space-y-4">
        <label htmlFor="patient-search" className="block text-sm font-medium">
          Search by name or NHI
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="patient-search"
            name="q"
            defaultValue={query}
            placeholder="e.g. Aroha, Demo-Walker or ZZZ0016"
            className={fieldClass}
          />
          <Button type="submit">Search</Button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {patients.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-black/15 bg-off-white p-8 text-sm text-charcoal">
          {query ? "No patients match this search." : "Search for a patient to start."}
        </div>
      ) : (
        <ul className="space-y-3">
          {patients.map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/patients/${patient.id}`}
                className="block rounded-[20px] border border-black/10 bg-white p-4 transition-colors hover:bg-off-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-sm text-charcoal">
                      DOB: {new Date(patient.dateOfBirth).toLocaleDateString("en-NZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-off-white px-3 py-1 font-mono text-xs font-medium tracking-[0.08em] text-hippo-900">
                    {patient.nhi ? `NHI ${patient.nhi}` : "No NHI"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
