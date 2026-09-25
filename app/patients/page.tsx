import { PatientSearch } from "@/components/patients/patient-search";
import { requireClinician } from "@/lib/auth";
import { searchPatients } from "@/lib/data/queries";
import { patientSearchSchema } from "@/lib/validation";

async function readQuery(searchParams?:
  | Promise<{ q?: string | string[] } | undefined>
  | { q?: string | string[] }
  | undefined,
) {
  const params = (await Promise.resolve(searchParams ?? {})) ?? {};
  const raw = params.q;
  return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ q?: string | string[] } | undefined>
    | { q?: string | string[] }
    | undefined;
}) {
  const { supabase } = await requireClinician();
  const query = await readQuery(searchParams);
  const parsed = patientSearchSchema.safeParse(query);
  const patients = parsed.success ? await searchPatients(supabase, parsed.data) : [];

  return (
    <>

      <main id="main" className="mx-auto max-w-6xl px-5 py-10 lg:px-[30px]">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-charcoal">Clinical dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold">Find a patient</h1>
        </div>
        <PatientSearch
          query={query}
          patients={patients}
          error={parsed.success ? undefined : parsed.error.issues[0].message}
        />
      </main>
    </>
  );
}
