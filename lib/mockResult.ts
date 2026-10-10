import type { DecodeResult } from "./types";

// Static example for styling the results view without calling the API.
export const mockResult: DecodeResult = {
  letterType: "eviction",
  summary:
    "Your landlord says you owe $1,450 in rent. If you do not pay or move out in 14 days, they can go to court to evict you.",
  urgency: "high",
  deadlines: [
    {
      date: "2026-10-24",
      what: "Pay the rent you owe or move out",
      sourceQuote:
        "You are required to pay the full amount of $1,450.00 or vacate the premises within fourteen (14) days.",
    },
  ],
  steps: [
    "Do not ignore this letter. You still have rights.",
    "Call a free legal aid office today to ask for help.",
    "If you can pay, pay the full amount and get a written receipt.",
    "If you cannot pay, ask about emergency rent help.",
    "Keep this letter and any receipts in a safe place.",
  ],
  sender: "Maple Street Apartments LLC",
  confidence: "high",
  language: "en",
};
