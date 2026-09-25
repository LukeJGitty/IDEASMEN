import "server-only";
import { NextResponse } from "next/server";
import { QueryError } from "@/lib/data/queries";

const noStore = { "Cache-Control": "private, no-store" };
const defaultMessages: Record<number, string> = {
  400: "The request is invalid.",
  401: "Sign in to continue.",
  403: "Only authorised clinicians can access patient records.",
  404: "Not found.",
};

// Every API response is `{ data }` or `{ error }`; see docs/architecture/API_CONTRACTS.md.
export const apiData = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status, headers: noStore });

export const apiError = (status: number, error?: string) =>
  NextResponse.json(
    { error: error ?? defaultMessages[status] ?? "Something went wrong." },
    { status, headers: noStore },
  );

/** Maps thrown query failures to a 500 without leaking database details. */
export async function handleApi(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof QueryError) return apiError(500, error.message);
    throw error;
  }
}
