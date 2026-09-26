/**
 * Where the demo seed scripts write, and which clinicians they use.
 *
 * Local (default): the local Supabase stack from `pnpm supabase status`, with the two
 * fictional clinicians clinician.a@example.com and clinician.b@example.com.
 *
 * Hosted (`--hosted`, used by `pnpm db:seed-hosted`): a hosted Supabase demo project,
 * read from .env.seed.local (never committed, never given to Vercel):
 *   SEED_SUPABASE_URL=https://<project-ref>.supabase.co
 *   SEED_SUPABASE_SERVICE_ROLE_KEY=<secret key from Project Settings, API Keys>
 *   SEED_CLINICIANS=you@example.com:Dr Your Name,teammate@example.com:Dr Their Name
 * Add ":no-roster" after a name to give that person a login but keep them off the roster.
 * Hosted codes are really emailed, so use your team's real email addresses.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

export interface SeedClinician {
  email: string;
  fullName: string;
  /** Appears on the demo roster (false when listed as "email:Name:no-roster"). */
  roster: boolean;
}

export interface SeedTarget {
  hosted: boolean;
  admin: SupabaseClient<Database>;
  /** a and b own the demo consultations and tasks; `all` are made clinicians. */
  clinicians: { a: SeedClinician; b: SeedClinician; all: SeedClinician[] };
}

const LOCAL_A = { email: "clinician.a@example.com", fullName: "Dr Demo A", roster: true };
const LOCAL_B = { email: "clinician.b@example.com", fullName: "Dr Demo B", roster: true };
const LOCAL_CLINICIANS = { a: LOCAL_A, b: LOCAL_B, all: [LOCAL_A, LOCAL_B] };

/**
 * "a@x.com:Dr A,b@y.com:Dr B,c@z.com:Dr C" -> every listed person becomes a clinician; the
 * first two own the demo data (b falls back to a if only one is given).
 */
export function parseClinicians(value: string | undefined): SeedTarget["clinicians"] {
  const list = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [email, ...parts] = entry.split(":");
      const clean = email.trim().toLowerCase();
      assert.match(clean, /^[^@\s]+@[^@\s]+\.[^@\s]+$/, `Not an email address: ${email}`);
      const offRoster = parts.length > 0 && /^\s*no-?roster\s*$/i.test(parts[parts.length - 1]);
      const name = (offRoster ? parts.slice(0, -1) : parts).join(":").trim();
      return { email: clean, fullName: name || clean.split("@")[0], roster: !offRoster };
    });
  assert.ok(list.length > 0, "Set SEED_CLINICIANS to at least one real email address (see scripts/seed-target.ts).");
  const unique = list.filter((c, i) => list.findIndex((d) => d.email === c.email) === i);
  return { a: unique[0], b: unique[1] ?? unique[0], all: unique };
}

/** Only https://<ref>.supabase.co is accepted for hosted seeding. */
export function assertHostedUrl(url: string | undefined): string {
  assert.ok(url, "Set SEED_SUPABASE_URL in .env.seed.local (see scripts/seed-target.ts).");
  const parsed = new URL(url);
  assert.ok(parsed.protocol === "https:", "SEED_SUPABASE_URL must start with https://");
  assert.match(parsed.hostname, /^[a-z0-9]+\.supabase\.co$/, "SEED_SUPABASE_URL must be https://<project-ref>.supabase.co");
  return parsed.origin;
}

export function resolveTarget(argv = process.argv): SeedTarget {
  if (argv.includes("--hosted")) {
    const url = assertHostedUrl(process.env.SEED_SUPABASE_URL);
    const key = process.env.SEED_SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(key && key.length > 20, "Set SEED_SUPABASE_SERVICE_ROLE_KEY in .env.seed.local.");
    return {
      hosted: true,
      admin: createClient<Database>(url, key, { auth: { persistSession: false } }),
      clinicians: parseClinicians(process.env.SEED_CLINICIANS),
    };
  }
  const local = JSON.parse(
    execFileSync("pnpm", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  assert.equal(new URL(local.API_URL).hostname, "127.0.0.1", "Only the local Supabase stack is allowed");
  return {
    hosted: false,
    admin: createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false } }),
    clinicians: LOCAL_CLINICIANS,
  };
}

/** Creates (or re-flags) every clinician and returns the user ids of a and b. */
export async function ensureClinicians(target: SeedTarget) {
  const { admin } = target;
  const { data: existing, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  assert.equal(error, null, error?.message);
  const byEmail = new Map<string, string>();
  for (const { email, fullName } of target.clinicians.all) {
    let id: string | undefined = existing.users.find((user) => user.email?.toLowerCase() === email)?.id;
    if (!id) {
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      assert.equal(created.error, null, created.error?.message);
      id = created.data.user!.id;
      existing.users.push(created.data.user!);
    }
    const userId: string = id;
    const flagged = await admin
      .from("profiles")
      .update({ is_clinician: true, full_name: fullName })
      .eq("id", userId);
    assert.equal(flagged.error, null, flagged.error?.message);
    byEmail.set(email, userId);
  }
  return { a: byEmail.get(target.clinicians.a.email)!, b: byEmail.get(target.clinicians.b.email)! };
}
