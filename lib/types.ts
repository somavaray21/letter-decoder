// Shared contract between the API route and the UI. Keep in sync with lib/schema.ts.

export type LetterType =
  | "medicaid"
  | "snap"
  | "medical_bill"
  | "eviction"
  | "financial_aid"
  | "other";

// en English, es Spanish, zh Mandarin (Simplified Chinese), fr French, hi Hindi, ar Arabic (right to left),
// tl Tagalog, ru Russian.
export type Language = "en" | "es" | "zh" | "fr" | "hi" | "ar" | "tl" | "ru";

// A phone number or email address printed in the letter.
export type LetterContact = {
  type: "phone" | "email";
  value: string; // exactly as printed, e.g. "(856) 555-0142" or "help@example.gov"
  label: string; // who it reaches, in the reader's language, e.g. "Billing office"
};

export type DecodeResult = {
  letterType: LetterType;
  summary: string; // 1–2 sentences, 6th-grade level
  urgency: "low" | "medium" | "high";
  deadlines: { date: string; what: string; sourceQuote: string }[]; // ISO date
  steps: string[]; // 3–5 actions
  sender: string;
  contacts: LetterContact[]; // every phone number and email printed in the letter
  confidence: "high" | "low"; // low = show "double-check this" banner
  language: string; // e.g. "en", "es"
  zip: string; // ZIP code from the recipient's address, or "" if not found
  fullText: string; // the full letter text, transcribed
};

export type LetterImage = {
  data: string; // base64, no data: prefix
  mimeType: string;
};

export type DecodeRequest = {
  images: LetterImage[]; // the pages of one letter, in order; empty only in demo mode
  language: Language;
  demo?: string; // demo letter key, only used with ?demo=1
};

export type TranslateRequest = {
  result: DecodeResult;
  language: Language;
};

export type ChatTurn = {
  question: string;
  answer: string;
};

export type AskRequest = {
  fullText: string;
  question: string;
  history: ChatTurn[]; // earlier questions and answers, oldest first
  language: Language;
};

export type AskResponse = {
  answer: string;
  sourceQuote: string | null; // exact line from the letter, or null if none
  foundInLetter: boolean;
};

export type Resource = {
  name: string;
  phone: string;
  url?: string;
  description: { en: string } & Partial<Record<Language, string>>; // English is used when a language is missing
  letterTypes: (LetterType | "all")[];
  zips?: string[]; // ZIP codes or prefixes served ("081" covers 08101–08199); omit for everywhere
};
