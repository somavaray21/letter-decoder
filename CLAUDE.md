# Letter Decoder

Hackathon app: photo of an official letter → plain-language explanation via Gemini. See README.md.

- Next.js App Router + TypeScript + Tailwind v4. No database, no auth, nothing stored.
- `lib/types.ts` is the shared contract; keep `lib/schema.ts` (zod) in sync with it.
- All interface text lives in `lib/i18n.ts` with both `en` and `es`; never hard-code UI strings.
- Accessibility matters for judging: large text, high contrast, labels on every control, visible focus, works at 375px.
- Gemini key is `GEMINI_API_KEY` in `.env.local`. Never commit it.
- Before committing: `npx tsc --noEmit && npm run lint && npm run build`.
