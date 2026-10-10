import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { decodeResultSchema } from "./schema";
import type { DecodeResult, Language } from "./types";

// Override with GEMINI_MODEL if Google ships a newer Flash model.
const DEFAULT_MODEL = "gemini-2.5-flash";

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  es: "Spanish",
};

const responseJsonSchema = z.toJSONSchema(decodeResultSchema);

function buildPrompt(language: Language, today: string): string {
  const languageName = LANGUAGE_NAMES[language];
  return `You help people understand official letters (government benefits, medical bills, housing, school financial aid).
Read the letter in the image and explain it to someone who may not read well and may be stressed.

Today's date is ${today}.

Rules:
- Write "summary", "steps", and each deadline's "what" in ${languageName}, at a 6th-grade reading level. Use short sentences and everyday words. No legal or medical jargon.
- "summary": 1 or 2 sentences saying what the letter is and what it wants from the reader.
- "letterType": medicaid, snap, medical_bill, eviction, financial_aid, or other.
- "urgency": "high" if missing it could cost the reader housing, health coverage, food aid, or money within about 30 days; "medium" if action is needed but not urgent; "low" if it is just information.
- "deadlines": every date by which the reader must do something. "date" is YYYY-MM-DD. If the letter gives a relative deadline (like "within 14 days"), work out the date from the letter's own date if shown, otherwise from today. "sourceQuote" is the exact sentence from the letter, copied word for word in its original language. Use an empty list if there are no deadlines.
- "steps": 3 to 5 concrete actions, most important first, each starting with a verb.
- "sender": the organization that sent the letter, as written on it.
- "confidence": "low" if the image is blurry, cut off, not an official letter, or you are unsure about any deadline or amount. Otherwise "high".
- "language": "${language}".
- Never invent phone numbers, amounts, dates, or names that are not in the letter.
- If the image is not a letter, set letterType "other", confidence "low", and say so in the summary.`;
}

export class DecodeError extends Error {}

export async function decodeLetter(
  image: string,
  mimeType: string,
  language: Language,
): Promise<DecodeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new DecodeError("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().slice(0, 10);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let lastError: unknown;
  // One try plus one retry if the JSON comes back malformed.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: image, mimeType } },
            { text: buildPrompt(language, today) },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature: 0.2,
      },
    });

    try {
      const parsed = decodeResultSchema.parse(JSON.parse(response.text ?? ""));
      return { ...parsed, language };
    } catch (err) {
      lastError = err;
    }
  }
  throw new DecodeError(`Gemini returned invalid JSON twice: ${String(lastError)}`);
}
