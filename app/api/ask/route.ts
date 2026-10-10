import { NextResponse } from "next/server";
import { geminiErrorResponse } from "@/lib/apiError";
import { askLetter } from "@/lib/gemini";
import { askRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

// Answers a question about the letter using only its transcribed text. Nothing is saved.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = askRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { fullText, question, history, language } = parsed.data;

  try {
    return NextResponse.json(await askLetter(fullText, question, history, language));
  } catch (err) {
    return geminiErrorResponse(err);
  }
}
