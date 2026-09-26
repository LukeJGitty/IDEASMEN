/**
 * Creates (or re-flags) the clinicians without touching any other data.
 * Local: pnpm db:seed-users. Hosted: pnpm db:clinicians-hosted (reads SEED_CLINICIANS).
 */
import { ensureClinicians, resolveTarget } from "./seed-target";

async function main() {
  const target = resolveTarget();
  await ensureClinicians(target);
  for (const { email, fullName } of target.clinicians.all) console.log(`Clinician ready: ${fullName} <${email}>`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seeding failed");
  process.exitCode = 1;
});
