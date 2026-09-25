import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  return {
    supabase,
    userId: data.claims.sub,
    email: String(data.claims.email ?? ""),
  };
}

/** For route handlers: reports 401/403 instead of redirecting. RLS still applies to every query. */
export async function authenticateClinician() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return { ok: false, status: 401 } as const;
  const { data: isClinician } = await supabase.rpc("is_clinician");
  if (!isClinician) return { ok: false, status: 403 } as const;
  return {
    ok: true,
    supabase,
    userId: data.claims.sub,
    email: String(data.claims.email ?? ""),
  } as const;
}

/** For pages and Server Actions handling clinical data. */
export async function requireClinician() {
  const result = await authenticateClinician();
  if (!result.ok)
    redirect(result.status === 401 ? "/login" : "/not-authorised");
  return result;
}
