import { NextResponse } from "next/server";
import { geminiErrorResponse } from "@/lib/apiError";
import { translateResult } from "@/lib/gemini";
import { translateRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

// Switches an existing result to another language. Text only, so it is much faster than decoding the photo again.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = translateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await translateResult(parsed.data.result, parsed.data.language));
  } catch (err) {
    return geminiErrorResponse(err);
  }
}
