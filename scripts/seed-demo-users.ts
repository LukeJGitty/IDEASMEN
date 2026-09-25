/** Local-only: creates (or re-flags) the two fictional demo clinicians. Sign in with their email code via the local inbox. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const clinicians = [
  { email: "clinician.a@example.com", fullName: "Dr Demo A" },
  { email: "clinician.b@example.com", fullName: "Dr Demo B" },
];

async function main() {
  const local = JSON.parse(
    execFileSync("pnpm", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  assert.equal(
    new URL(local.API_URL).hostname,
    "127.0.0.1",
    "Only the local Supabase stack is allowed",
  );
  const admin = createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  async function createClinician(email: string, fullName: string) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    assert.equal(error, null);
    return data.user!.id;
  }
  const { data: existing, error } = await admin.auth.admin.listUsers();
  assert.equal(error, null);
  for (const { email, fullName } of clinicians) {
    const id: string =
      existing.users.find((user) => user.email === email)?.id ??
      (await createClinician(email, fullName));
    const { error: flagError } = await admin
      .from("profiles")
      .update({ is_clinician: true, full_name: fullName })
      .eq("id", id);
    assert.equal(flagError, null);
    console.log(`Clinician ready: ${email}`);
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seeding failed");
  process.exitCode = 1;
});
