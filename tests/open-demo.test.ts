import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20260927010000_open_demo.sql", import.meta.url), "utf8");

test("open demo mode is off by default and only the service role can switch it", () => {
  assert.match(sql, /open_signup boolean not null default false/);
  assert.match(sql, /revoke execute on function public\.set_open_demo\(boolean\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.set_open_demo\(boolean\) to service_role;/);
  assert.match(sql, /revoke all on public\.demo_settings from anon, authenticated;/);
  assert.doesNotMatch(sql, /create policy/i, "no client can read or change the setting");
});
