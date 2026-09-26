/**
 * Rebuilds only the demo roster (rows noted "demo roster"), leaving patients, notes and
 * tasks alone. Local: pnpm db:roster. Hosted: pnpm db:roster-hosted (reads SEED_CLINICIANS;
 * add ":no-roster" after someone's name to keep them off it).
 */
import assert from "node:assert/strict";
import { buildDemoRoster } from "./demo-roster";
import { resolveTarget } from "./seed-target";

async function main() {
  const target = resolveTarget();
  const shifts = buildDemoRoster(target.clinicians);
  assert.equal((await target.admin.from("roster_shifts").delete().like("notes", "demo%")).error, null);
  const { error } = await target.admin.from("roster_shifts").insert(shifts);
  assert.equal(error, null, error?.message);
  const off = target.clinicians.all.filter((c) => !c.roster).map((c) => c.fullName);
  console.log(`Roster ready: ${shifts.length} shifts over 8 days.${off.length ? ` Not rostered: ${off.join(", ")}.` : ""}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Roster seeding failed");
  process.exitCode = 1;
});
