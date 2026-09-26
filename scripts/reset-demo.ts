/**
 * Clears everything people added on the site and restores the demo exactly.
 *
 * Removes every patient, consultation (and its audio), task and referral that isn't part
 * of the demo data, then re-runs the demo seed, which also undoes edits to the 18 demo
 * patients. Logins, the roster's extra shifts and the referral directory are left alone.
 *
 *   pnpm db:reset-hosted          shows what would be removed (changes nothing)
 *   pnpm db:reset-hosted --yes    does it
 * Local: pnpm db:reset-demo [--yes]
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { demoPatients } from "./demo-patients";
import { resolveTarget } from "./seed-target";

const DEMO_PREFIX = { consultations: "dc000000-", tasks: "da000000-", referrals: "db000000-" } as const;
const BUCKET = "consultation-audio";

const chunks = <T>(items: T[], size = 100) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

async function main() {
  const target = resolveTarget();
  const { admin } = target;
  const confirmed = process.argv.includes("--yes");
  const demoPatientIds = new Set(demoPatients.map((p) => p.id!));

  const [patients, consultations, tasks, referrals] = await Promise.all([
    admin.from("patients").select("id, first_name, last_name").limit(5000),
    admin.from("consultations").select("id, patient_id, audio_path").limit(5000),
    admin.from("tasks").select("id").limit(10000),
    admin.from("referrals").select("id").limit(5000),
  ]);
  for (const r of [patients, consultations, tasks, referrals]) assert.equal(r.error, null, r.error?.message);

  const extraPatients = patients.data!.filter((p) => !demoPatientIds.has(p.id));
  const extraConsultations = consultations.data!.filter((c) => !c.id.startsWith(DEMO_PREFIX.consultations));
  const extraTasks = tasks.data!.filter((t) => !t.id.startsWith(DEMO_PREFIX.tasks));
  const extraReferrals = referrals.data!.filter((r) => !r.id.startsWith(DEMO_PREFIX.referrals));
  const audio = extraConsultations.map((c) => c.audio_path).filter((p): p is string => Boolean(p));

  console.log(`${target.hosted ? "Hosted" : "Local"} project. Added on the site since the demo was loaded:`);
  console.log(`  ${extraPatients.length} patient(s)${extraPatients.length ? ": " + extraPatients.slice(0, 12).map((p) => `${p.first_name} ${p.last_name}`).join(", ") + (extraPatients.length > 12 ? ", …" : "") : ""}`);
  console.log(`  ${extraConsultations.length} consultation(s), ${audio.length} recording(s)`);
  console.log(`  ${extraTasks.length} task(s), ${extraReferrals.length} referral(s)`);
  if (!confirmed) {
    console.log("\nNothing changed. Run again with --yes to remove these and restore the demo.");
    return;
  }

  const remove = async (table: "referrals" | "tasks" | "consultations" | "patients", ids: string[]) => {
    for (const chunk of chunks(ids)) {
      const { error } = await admin.from(table).delete().in("id", chunk);
      assert.equal(error, null, `${table}: ${error?.message}`);
    }
  };
  // Children first. Removing a patient also removes their medicines and conditions.
  await remove("referrals", extraReferrals.map((r) => r.id));
  await remove("tasks", extraTasks.map((t) => t.id));
  await remove("consultations", extraConsultations.map((c) => c.id));
  await remove("patients", extraPatients.map((p) => p.id));
  for (const chunk of chunks(audio)) {
    const { error } = await admin.storage.from(BUCKET).remove(chunk);
    if (error) console.warn(`Some recordings could not be removed: ${error.message}`);
  }
  console.log("Removed. Restoring the demo data…\n");

  // The seed restores demo patients' details, medicines, conditions, visits, tasks,
  // referrals and the demo roster. It reads the same settings as this script.
  execFileSync(
    "pnpm",
    ["exec", "tsx", "scripts/seed-demo-data.ts", ...(target.hosted ? ["--hosted"] : [])],
    { stdio: "inherit", env: process.env },
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Reset failed");
  process.exitCode = 1;
});
