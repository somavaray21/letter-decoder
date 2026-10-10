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

// Saved results for the printed sample letters, used with ?demo=1.
export const DEMO_LETTERS = [
  "eviction",
  "medicaid",
  "medical_bill",
  "snap",
  "financial_aid",
] as const;

export type DemoLetter = (typeof DEMO_LETTERS)[number];

const demoResults: Record<DemoLetter, Record<Language, DecodeResult>> = {
  eviction: { en: evictionEn as DecodeResult, es: evictionEs as DecodeResult },
  medicaid: { en: medicaidEn as DecodeResult, es: medicaidEs as DecodeResult },
  medical_bill: { en: medicalBillEn as DecodeResult, es: medicalBillEs as DecodeResult },
  snap: { en: snapEn as DecodeResult, es: snapEs as DecodeResult },
  financial_aid: { en: financialAidEn as DecodeResult, es: financialAidEs as DecodeResult },
};

export function getDemoResult(key: string, language: Language): DecodeResult | null {
  if (!(DEMO_LETTERS as readonly string[]).includes(key)) return null;
  return demoResults[key as DemoLetter][language];
}
