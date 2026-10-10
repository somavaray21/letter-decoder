import { NextResponse } from "next/server";
import { getDemoResult } from "@/data/demo";
import { geminiErrorResponse } from "@/lib/apiError";
import { decodeLetter, translateResult } from "@/lib/gemini";
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
  const { images, language, demo } = parsed.data;

  // Demo mode: return a saved result so the stage demo never depends on the API.
  // Only English and Spanish are saved; other languages translate the English result with Gemini.
  if (demo) {
    const saved = getDemoResult(demo, language);
    const english = saved ? null : getDemoResult(demo, "en");
    if (!saved && !english) {
      return NextResponse.json({ error: "unknown_demo" }, { status: 400 });
    }
    if (saved) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return NextResponse.json(saved);
    }
    try {
      return NextResponse.json(await translateResult(english!, language));
    } catch (err) {
      return geminiErrorResponse(err);
    }
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await decodeLetter(images, language);
    return NextResponse.json(result);
  } catch (err) {
    return geminiErrorResponse(err);
  }
}
