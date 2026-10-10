import { NextResponse } from "next/server";
import { DecodeError } from "./gemini";

// Turns a Gemini failure into { error: code, detail? } with a matching HTTP status.
export function geminiErrorResponse(err: unknown) {
  console.error("gemini request failed", err);
  const code = err instanceof DecodeError ? err.code : "gemini_error";
  const status = code === "rate_limited" ? 429 : code === "bad_output" ? 502 : 500;
  // The raw reason helps while building locally; production only gets the code.
  const detail = process.env.NODE_ENV !== "production" && err instanceof Error ? err.message : undefined;
  return NextResponse.json({ error: code, detail }, { status });
}
