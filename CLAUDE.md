# Letter Decoder

Hackathon app: photo of an official letter → plain-language explanation via Gemini. See README.md.

- Next.js App Router + TypeScript + Tailwind v4. No database, no auth, nothing stored.
- `lib/types.ts` is the shared contract; keep `lib/schema.ts` (zod) in sync with it.
- All interface text lives in `lib/i18n.ts` in every language (en, es, zh, fr, hi, ar, tl, ru; Arabic is right to left, so use logical classes like `ms-`/`pe-`/`start-`); never hard-code UI strings.
- Accessibility matters for judging: large text, high contrast, labels on every control, visible focus, works at 375px.
- Gemini key is `GEMINI_API_KEY` in `.env.local`. Never commit it.
- Before committing: `npx tsc --noEmit && npm run lint && npm run build`.

## Design system (use for every page)
Feel: calm, warm, trustworthy — like a helpful librarian, not a bank or a startup. The user may be stressed and reading on an old phone.

Colors (define as CSS variables in globals.css):
- Background: warm off-white #FAF7F2. Cards: white #FFFFFF with a soft 1px border #E8E2D9.
- Text: near-black #1F1B16. Secondary text: #5C554C (never lighter — must pass WCAG AA).
- Primary (buttons, links): deep teal #0F5C5C. Hover: #0B4747.
- Urgency: high = #B42318 on #FEF3F2, medium = #B54708 on #FFFAEB, low = #067647 on #ECFDF3. Always pair color with a text label and an icon.

Type:
- Headings: "Fraunces" (Google Font, serif) for warmth. Body: "Atkinson Hyperlegible" (Google Font, designed for low vision).
- Body text 18px minimum, line-height 1.6. Headings 28–32px on mobile.

Layout:
- Mobile-first, single column, max-width 640px centered on desktop. 20px side padding.
- Big tap targets: buttons at least 56px tall, full width on mobile, rounded 14px.
- Generous spacing between sections (24–32px). One main action per screen.

Components:
- Cards with 16px radius and subtle shadow for each result section.
- Deadlines: a large date ("Nov 15") on the left, what's due on the right, the source quote in small italic below.
- Steps: big numbered circles (1, 2, 3) in teal.
- Loading: friendly message ("Reading your letter…") with a gentle pulsing animation, not a spinner alone.

Accessibility (non-negotiable):
- Every button has a text label; visible focus ring (3px teal outline).
- Respect prefers-reduced-motion.
- Plain words everywhere: "Upload a photo".
