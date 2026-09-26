/** Creates (or re-flags) the demo clinicians. Local by default; see scripts/seed-target.ts. */
import { ensureClinicians, resolveTarget } from "./seed-target";

async function main() {
  const target = resolveTarget();
  await ensureClinicians(target);
  for (const { email } of new Set(Object.values(target.clinicians))) console.log(`Clinician ready: ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seeding failed");
  process.exitCode = 1;
});
