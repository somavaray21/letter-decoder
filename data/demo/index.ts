import type { DecodeResult, Language } from "@/lib/types";
import evictionEn from "./eviction.en.json";
import evictionEs from "./eviction.es.json";
import financialAidEn from "./financial_aid.en.json";
import financialAidEs from "./financial_aid.es.json";
import medicaidEn from "./medicaid.en.json";
import medicaidEs from "./medicaid.es.json";
import medicalBillEn from "./medical_bill.en.json";
import medicalBillEs from "./medical_bill.es.json";
import snapEn from "./snap.en.json";
import snapEs from "./snap.es.json";
import { LETTER_TEXT } from "./letters";

// Saved results for the printed sample letters, used with ?demo=1.
export const DEMO_LETTERS = [
  "eviction",
  "medicaid",
  "medical_bill",
  "snap",
  "financial_aid",
] as const;

export type DemoLetter = (typeof DEMO_LETTERS)[number];

// fullText is added from ./letters when a result is returned.
type SavedResult = Omit<DecodeResult, "fullText">;

const demoResults: Record<DemoLetter, Partial<Record<Language, SavedResult>>> = {
  eviction: { en: evictionEn as SavedResult, es: evictionEs as SavedResult },
  medicaid: { en: medicaidEn as SavedResult, es: medicaidEs as SavedResult },
  medical_bill: { en: medicalBillEn as SavedResult, es: medicalBillEs as SavedResult },
  snap: { en: snapEn as SavedResult, es: snapEs as SavedResult },
  financial_aid: { en: financialAidEn as SavedResult, es: financialAidEs as SavedResult },
};

// Returns null for an unknown letter or a language with no saved result (only English and Spanish are saved).
export function getDemoResult(key: string, language: Language): DecodeResult | null {
  if (!(DEMO_LETTERS as readonly string[]).includes(key)) return null;
  const saved = demoResults[key as DemoLetter][language];
  return saved ? { ...saved, fullText: LETTER_TEXT[key as DemoLetter] } : null;
}
