# Letter Decoder

Take a photo of a confusing official letter (Medicaid renewal, hospital bill, eviction notice, SNAP recertification, financial aid) and get a plain-language explanation: what it is, how urgent it is, the deadlines, 3–5 next steps and who to call. English and Spanish, with read-aloud.

Next.js (App Router) + TypeScript + Tailwind, one API route, no database, no login. Nothing is stored.

## Run it

```bash
npm install
cp .env.example .env.local   # paste a free key from https://aistudio.google.com/apikey
npm run dev                  # http://localhost:3000
```

Test the API without the UI (server must be running):

```bash
npm run test:decode -- path/to/sample-letter.png es
```

Only send mock letters to the free Gemini tier: Google may use free-tier inputs.

## Demo mode

Open `http://localhost:3000/?demo=1`. Pick the sample letter from the dropdown, take the photo as usual, and the app returns the saved result from `data/demo/` instead of calling Gemini. Use this on stage so the demo never depends on Wi-Fi or rate limits.

## How it works

1. `app/page.tsx` shrinks the photo to ~1500px wide in the browser and POSTs it with the language to `/api/decode`.
2. `app/api/decode/route.ts` validates the request and calls `lib/gemini.ts`, which sends the image to Gemini Flash-Lite in JSON mode with the `DecodeResult` schema and validates the answer with zod. If Flash-Lite is busy or returns bad JSON, it falls back to Gemini Flash. Letters are always read in English first; Spanish is a second, text-only translation call, which keeps accents right.
   Switching language on the results page calls `app/api/translate/route.ts`, which translates the existing result without sending the photo again (under a second).
3. `components/ResultView.tsx` shows the summary, urgency badge, deadlines (with the quoted line from the letter and an "Add to calendar" .ics download), numbered steps and matching local help from `data/resources.json`.
4. Read-aloud uses the browser's `speechSynthesis`, picking a Spanish voice for Spanish.

| File | What it is |
| --- | --- |
| `lib/types.ts` | Shared `DecodeResult` contract |
| `lib/schema.ts` | zod versions of the contract and request |
| `lib/i18n.ts` | All interface text in English and Spanish |
| `lib/mockResult.ts` | Example result for styling |
| `data/demo/` | Saved results for the five sample letters, per language |
| `data/resources.json` | Local help orgs, matched by `letterTypes` |

## Content team TODO

- **`data/resources.json`** only has 211 right now. Add 6–8 verified local orgs: `name`, `phone`, optional `url`, `description.en`/`description.es`, `letterTypes` (any of `medicaid`, `snap`, `medical_bill`, `eviction`, `financial_aid`, `other`, or `all`), and optional `zips`: the ZIP codes or prefixes the org serves (`"081"` covers 08101–08199). Orgs without `zips` show for every letter; orgs with `zips` show only when the letter's recipient ZIP matches.
- **`data/demo/*.json`** are written for fictional sample letters. Once the printed sample letters exist, update the amounts, dates, sender and `sourceQuote` so they match what's on paper.

## Deploy

Import the repo in Vercel and set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in the project's environment variables.
