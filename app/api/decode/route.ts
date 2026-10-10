import { NextResponse } from "next/server";
import { getDemoResult } from "@/data/demo";
import { DecodeError, decodeLetter } from "@/lib/gemini";
import { decodeRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = decodeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { image, mimeType, language, demo } = parsed.data;

  // Demo mode: return a saved result so the stage demo never depends on the API.
  if (demo) {
    const result = getDemoResult(demo, language);
    if (!result) {
      return NextResponse.json({ error: "unknown_demo" }, { status: 400 });
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return NextResponse.json(result);
  }

  try {
    const result = await decodeLetter(image, mimeType, language);
    return NextResponse.json(result);
  } catch (err) {
    console.error("decode failed", err);
    const code = err instanceof DecodeError ? err.code : "gemini_error";
    const status = code === "rate_limited" ? 429 : code === "bad_output" ? 502 : 500;
    // The raw reason helps while building locally; production only gets the code.
    const detail = process.env.NODE_ENV !== "production" && err instanceof Error ? err.message : undefined;
    return NextResponse.json({ error: code, detail }, { status });
  }
}
