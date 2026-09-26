// Plain-English reasons for OpenAI API errors. Only the HTTP status, OpenAI's error code
// and the name of a rejected parameter are used: never the error message, which can echo
// the request (a transcript, a note). Safe to show on screen and to log.

export function explainOpenAIError(status: number, code?: string, param?: string, modelVar = "the model setting") {
  if (status === 401 || code === "invalid_api_key")
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in the hosting settings, then redeploy.";
  if (code === "insufficient_quota")
    return "The OpenAI account has no credit left. Add credit or raise the limit in OpenAI's billing settings.";
  if (status === 429) return "OpenAI is rate-limiting requests. Wait a minute and retry.";
  if (status === 404 || code === "model_not_found")
    return `OpenAI doesn't recognise the model. Remove ${modelVar} to use the default.`;
  if (status === 403) return "This OpenAI key isn't allowed to use this model. Check the key's project permissions.";
  if (status === 413) return "The recording is too large for OpenAI.";
  if (status === 400)
    return param ? `OpenAI rejected the request (setting: ${param}).` : "OpenAI couldn't process the request.";
  if (status >= 500) return "OpenAI is having problems. Retry in a minute.";
  return `OpenAI returned ${status}.`;
}

const safeToken = (v: unknown) => (typeof v === "string" && /^[a-z0-9_.-]{1,64}$/i.test(v) ? v : undefined);

export async function openAIErrorReason(response: Response, modelVar?: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: unknown; param?: unknown; type?: unknown };
  } | null;
  const code = safeToken(body?.error?.code) ?? safeToken(body?.error?.type);
  return explainOpenAIError(response.status, code, safeToken(body?.error?.param), modelVar);
}
