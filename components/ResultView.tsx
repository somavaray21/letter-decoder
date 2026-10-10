"use client";

import { downloadIcs } from "@/lib/calendar";
import { formatDate, type Strings } from "@/lib/i18n";
import type { DecodeResult, Language } from "@/lib/types";
import { ReadAloudButton } from "./ReadAloudButton";
import { Resources } from "./Resources";

const URGENCY_STYLES = {
  high: { className: "bg-red-700 text-white", icon: "⚠️" },
  medium: { className: "bg-amber-300 text-neutral-950", icon: "⏰" },
  low: { className: "bg-green-700 text-white", icon: "✓" },
} as const;

export function ResultView({ result, language, t }: { result: DecodeResult; language: Language; t: Strings }) {
  const urgency = URGENCY_STYLES[result.urgency];

  return (
    <div className="space-y-6">
      {result.confidence === "low" && (
        <div role="alert" className="rounded-xl border-4 border-amber-500 bg-amber-50 p-4 text-lg font-semibold text-neutral-950">
          <span aria-hidden="true">⚠️ </span>
          {t.lowConfidence}
        </div>
      )}

      <section aria-labelledby="summary-title" className="card">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-4 py-1 text-lg font-bold ${urgency.className}`}>
            <span aria-hidden="true">{urgency.icon} </span>
            <span className="sr-only">{t.urgencyLabel}: </span>
            {t.urgency[result.urgency]}
          </span>
          <span className="text-lg font-semibold text-neutral-700">{t.letterTypes[result.letterType]}</span>
        </div>
        <h2 id="summary-title" className="section-title">
          {t.whatItIs}
        </h2>
        <p className="text-2xl leading-snug">{result.summary}</p>
        {result.sender && (
          <p className="mt-3 text-lg text-neutral-700">
            <strong>{t.from}:</strong> {result.sender}
          </p>
        )}
      </section>

      <ReadAloudButton result={result} language={language} t={t} />

      <section aria-labelledby="deadlines-title" className="card">
        <h2 id="deadlines-title" className="section-title">
          {t.deadlines}
        </h2>
        {result.deadlines.length === 0 ? (
          <p>{t.noDeadlines}</p>
        ) : (
          <ul className="space-y-5">
            {result.deadlines.map((d, i) => (
              <li key={`${d.date}-${i}`} className="rounded-xl border-l-8 border-red-700 bg-red-50 p-4">
                <p className="text-2xl font-bold text-red-900">{formatDate(d.date, language)}</p>
                <p className="mt-1 text-xl">{d.what}</p>
                {d.sourceQuote && (
                  <blockquote className="mt-3 border-l-4 border-neutral-400 pl-3 text-base italic text-neutral-800">
                    <span className="not-italic font-semibold">{t.letterSays}: </span>“{d.sourceQuote}”
                  </blockquote>
                )}
                <button
                  type="button"
                  onClick={() => downloadIcs(d.date, d.what, `${result.sender}\n${d.sourceQuote}`)}
                  className="btn mt-3 border-2 border-neutral-900 bg-white text-neutral-900"
                >
                  <span aria-hidden="true">📅</span> {t.addToCalendar}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="steps-title" className="card">
        <h2 id="steps-title" className="section-title">
          {t.steps}
        </h2>
        <ol className="space-y-4">
          {result.steps.map((step, i) => (
            <li key={i} className="flex gap-4 text-xl">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-800 text-lg font-bold text-white"
              >
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <Resources letterType={result.letterType} language={language} t={t} />

      <p className="text-base text-neutral-700">{t.disclaimer}</p>
    </div>
  );
}
