# DocuMate

Upload photos or PDFs of confusing official letters, one or several at once (Medicaid renewal, hospital bill, eviction notice, SNAP recertification, financial aid), and get a plain-language explanation: what it is, how urgent it is, the deadlines, 3–5 next steps, and who to call, including the phone numbers and emails printed in the letter. In English, Spanish, Mandarin, French, Hindi, Arabic (right to left), Tagalog and Russian, with read-aloud.

Next.js (App Router) + TypeScript + Tailwind, one API route, no database, no login. Nothing is stored.

## Run it

```bash
npm install
cp .env.example .env.local   # paste a free key from https://aistudio.google.com/apikey
npm run dev                  # http://localhost:3000
```

Test the API without the UI (server must be running):

```bash
npm run test:decode -- path/to/page1.png path/to/page2.png es
```

Only send mock letters to the free Gemini tier: Google may use free-tier inputs.

## Demo mode

Open `http://localhost:3000/?demo=1`. Pick the sample letter from the dropdown and press "Explain my letter" (no photo needed); the app returns the saved result from `data/demo/` instead of calling Gemini. Only English and Spanish are saved; the other languages translate the saved English result with Gemini. Use this on stage so the demo never depends on Wi-Fi or rate limits.

## How it works

1. `app/page.tsx` treats each uploaded file as its own document: a photo is shrunk to ~1500px wide, a PDF is sent as it is (up to about 3 MB, so it stays under Vercel's request limit), and a multi-page PDF stays one document. Every document is POSTed to `/api/decode` separately, at the same time, and the results page shows one "Document 1 of 2" section per document with its own explanation, file, contacts and chat. The files stay in page state so they can be opened again on the results page; they are never saved.
2. `app/api/decode/route.ts` validates the request and calls `lib/gemini.ts`, which sends the photo or PDF to Gemini Flash-Lite in JSON mode with the `DecodeResult` schema and validates the answer with zod. If Flash-Lite is busy or returns bad JSON, it falls back to Gemini Flash. Letters are always read in English first; every other language is a second, text-only translation call, which keeps accents and scripts right.
   Switching language on the results page calls `app/api/translate/route.ts`, which translates the existing result without sending the photo again (under a second).
3. The screens follow the Figma design (light and dark, Normal and Large text). `components/ResultView.tsx` shows the summary, urgency badge, deadlines (with the quoted line from the letter and an "Add to calendar" .ics download), numbered steps, and "Who can help": the phone numbers (tap to call) and emails (tap to write) found in the letter, then matching local help from `data/resources.json`. Arabic flips the page to right to left.
4. Read-aloud uses the browser's `speechSynthesis`, picking a voice for the chosen language when the device has one.

| File | What it is |
| --- | --- |
| `lib/types.ts` | Shared `DecodeResult` contract |
| `lib/schema.ts` | zod versions of the contract and request |
| `lib/i18n.ts` | All interface text in all eight languages |
| `lib/mockResult.ts` | Example result for styling |
| `data/demo/` | Saved results for the five sample letters, per language |
| `data/resources.json` | Local help orgs, matched by `letterTypes` |

## Content team TODO

- **`data/resources.json`** only has 211 right now. Add 6–8 verified local orgs: `name`, `phone`, optional `url`, `description.en` (plus any of `es`, `zh`, `fr`, `hi`, `ar`, `tl`, `ru`; English is shown when one is missing), `letterTypes` (any of `medicaid`, `snap`, `medical_bill`, `eviction`, `financial_aid`, `other`, or `all`), and optional `zips`: the ZIP codes or prefixes the org serves (`"081"` covers 08101–08199). Orgs without `zips` show for every letter; orgs with `zips` show only when the letter's recipient ZIP matches.
- **`data/demo/*.json`** are written for fictional sample letters. Once the printed sample letters exist, update the amounts, dates, sender and `sourceQuote` so they match what's on paper.

## Deploy

Import the repo in Vercel and set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in the project's environment variables.
