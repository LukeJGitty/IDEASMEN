"use server";
import { headers } from "next/headers";
import { devInboxEnabled, latestDevCode } from "@/lib/dev-inbox";
import { emailSchema } from "@/lib/validation";

const LOCAL_BROWSER = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Local development only: the newest sign-in code for `email` sent since `sinceIso`.
 * Returns nothing on a production build, a hosted Supabase project, or when the page
 * was opened from another device on the network.
 */
export async function getDevCode(email: string, sinceIso: string): Promise<{ code?: string }> {
  if (!devInboxEnabled()) return {};
  const host = (await headers()).get("host") ?? "";
  if (!LOCAL_BROWSER.test(host)) return {};
  const parsed = emailSchema.safeParse(email);
  const since = new Date(sinceIso);
  if (!parsed.success || Number.isNaN(since.getTime())) return {};
  return { code: await latestDevCode(parsed.data, since) };
}

