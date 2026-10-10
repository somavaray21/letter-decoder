import { z } from "zod";

export const LETTER_TYPES = [
  "medicaid",
  "snap",
  "medical_bill",
  "eviction",
  "financial_aid",
  "other",
] as const;

export const LANGUAGES = ["en", "es"] as const;

// Runtime check for what Gemini sends back. Mirrors DecodeResult in lib/types.ts.
export const decodeResultSchema = z.object({
  letterType: z.enum(LETTER_TYPES),
  summary: z.string().min(1),
  urgency: z.enum(["low", "medium", "high"]),
  deadlines: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
      what: z.string().min(1),
      sourceQuote: z.string(),
    }),
  ),
  steps: z.array(z.string().min(1)).min(1).max(6),
  sender: z.string(),
  confidence: z.enum(["high", "low"]),
  language: z.string(),
});

// ~6 MB of base64 is far more than a 1500px JPEG needs.
export const MAX_IMAGE_BASE64_LENGTH = 6_000_000;

export const decodeRequestSchema = z.object({
  image: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
  mimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/i),
  language: z.enum(LANGUAGES),
  demo: z.string().optional(),
});
