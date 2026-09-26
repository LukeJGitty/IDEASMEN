/**
 * Open demo mode on the hosted project: anyone who signs in with any email becomes a
 * clinician named "Dr Demo"; people added by name keep their names.
 *   pnpm db:open-demo-hosted on    let anyone in
 *   pnpm db:open-demo-hosted off   back to approved clinicians only (removes "Dr Demo" access)
 */
import assert from "node:assert/strict";
import { resolveTarget } from "./seed-target";

async function main() {
  const mode = process.argv.find((a) => a === "on" || a === "off");
  assert.ok(mode, "Say on or off, for example: pnpm db:open-demo-hosted on");
  const { admin } = resolveTarget();
  const { data, error } = await admin.rpc("set_open_demo", { enabled: mode === "on" });
  assert.equal(error, null, error?.message);
  console.log(
    mode === "on"
      ? `Open demo is ON. Anyone can sign in and appears as Dr Demo. ${data} earlier account(s) let in.`
      : `Open demo is OFF. Only named clinicians can sign in. ${data} Dr Demo account(s) removed.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not change open demo mode");
  process.exitCode = 1;
});
