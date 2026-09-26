// Local development helper: reads the newest sign-in code for an email from the local
// Supabase test inbox (Mailpit), so the login page can show it straight away.
// It is off unless ALL of these hold: not a production build, Supabase points at this
// machine, and DEV_CODE_POPUP is not "off". A real hosted site can never use it.
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function devInboxEnabled(env: Record<string, string | undefined> = process.env) {
  if (env.NODE_ENV === "production" || env.DEV_CODE_POPUP === "off") return false;
  try {
    return LOCAL_HOSTS.has(new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname);
  } catch {
    return false;
  }
}

/** The local inbox URL. Only ever a local address, whatever the environment says. */
export function devInboxUrl(env: Record<string, string | undefined> = process.env) {
  const fallback = "http://127.0.0.1:55434";
  try {
    const url = new URL(env.LOCAL_INBOX_URL || fallback);
    return LOCAL_HOSTS.has(url.hostname) ? url.origin : fallback;
  } catch {
    return fallback;
  }
}

interface InboxSummary {
  ID: string;
  Created: string;
  To?: { Address: string }[];
}

/** Pulls the code out of the email body: the first 6 to 10 digit number. */
export function extractCode(body: string) {
  return body.match(/\b\d{6,10}\b/)?.[0];
}

/**
 * Newest code sent to `email` after `since` (so an old code is never shown), or undefined.
 */
export async function latestDevCode(
  email: string,
  since: Date,
  options: { fetchImpl?: typeof fetch; inbox?: string } = {},
): Promise<string | undefined> {
  const doFetch = options.fetchImpl ?? fetch;
  const inbox = options.inbox ?? devInboxUrl();
  const target = email.trim().toLowerCase();
  try {
    const list = (await (
      await doFetch(`${inbox}/api/v1/messages?limit=20`, { signal: AbortSignal.timeout(3000) })
    ).json()) as { messages?: InboxSummary[] };
    const message = (list.messages ?? [])
      .filter(
        (item) =>
          new Date(item.Created).getTime() >= since.getTime() - 2000 &&
          item.To?.some((to) => to.Address.toLowerCase() === target),
      )
      .sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created))[0];
    if (!message) return undefined;
    const body = (await (
      await doFetch(`${inbox}/api/v1/message/${encodeURIComponent(message.ID)}`, {
        signal: AbortSignal.timeout(3000),
      })
    ).json()) as { Text?: string; HTML?: string };
    return extractCode(String(body.Text || body.HTML || ""));
  } catch {
    return undefined;
  }
}
