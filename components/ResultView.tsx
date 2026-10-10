"use client";

import { downloadIcs } from "@/lib/calendar";
import { formatDate, formatShortDate, type Strings } from "@/lib/i18n";
import type { DecodeResult, Language } from "@/lib/types";
import { ReadAloudButton } from "./ReadAloudButton";
import { Resources } from "./Resources";

const URGENCY_STYLES = {
  high: { className: "bg-high-bg text-high border-high", icon: "⚠️" },
  medium: { className: "bg-medium-bg text-medium border-medium", icon: "⏰" },
  low: { className: "bg-low-bg text-low border-low", icon: "✓" },
} as const;

export function ResultView({ result, language, t }: { result: DecodeResult; language: Language; t: Strings }) {
  const urgency = URGENCY_STYLES[result.urgency];

  return (
    <div className="space-y-7">
      {result.confidence === "low" && (
        <div role="alert" className="rounded-2xl border-2 border-medium bg-medium-bg p-4 font-bold text-ink">
          <span aria-hidden="true">⚠️ </span>
          {t.lowConfidence}
        </div>
      )}

      <section aria-labelledby="summary-title" className="card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-4 py-1 font-bold ${urgency.className}`}>
            <span aria-hidden="true">{urgency.icon} </span>
            <span className="sr-only">{t.urgencyLabel}: </span>
            {t.urgency[result.urgency]}
          </span>
          <span className="font-bold text-muted">{t.letterTypes[result.letterType]}</span>
        </div>
        <h2 id="summary-title" className="section-title">
          {t.whatItIs}
        </h2>
        <p className="text-[1.3rem] leading-relaxed">{result.summary}</p>
        {result.sender && (
          <p className="mt-4 text-muted">
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
          <p className="text-muted">{t.noDeadlines}</p>
        ) : (
          <ul className="divide-y divide-line">
            {result.deadlines.map((d, i) => {
              const short = formatShortDate(d.date, language);
              return (
                <li key={`${d.date}-${i}`} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    <div
                      className="flex w-20 shrink-0 flex-col items-center rounded-[14px] bg-high-bg py-2 text-high"
                      aria-label={formatDate(d.date, language)}
                      role="img"
                    >
                      <span className="text-sm font-bold uppercase">{short.month}</span>
                      <span className="font-serif text-3xl font-semibold leading-none">{short.day}</span>
                      <span className="text-xs">{short.year}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold">{d.what}</p>
                      <p className="text-muted capitalize">{short.weekday}</p>
                    </div>
                  </div>
                  {d.sourceQuote && (
                    <p className="mt-3 text-base italic text-muted">
                      <span className="not-italic font-bold">{t.letterSays}: </span>“{d.sourceQuote}”
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadIcs(d.date, d.what, `${result.sender}\n${d.sourceQuote}`)}
                    className="btn btn-secondary mt-4"
                  >
                    <span aria-hidden="true">📅</span> {t.addToCalendar}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="steps-title" className="card">
        <h2 id="steps-title" className="section-title">
          {t.steps}
        </h2>
        <ol className="space-y-5">
          {result.steps.map((step, i) => (
            <li key={i} className="flex gap-4 text-lg">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal font-serif text-xl font-semibold text-white"
              >
                {i + 1}
              </span>
              <span className="pt-1.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <Resources letterType={result.letterType} zip={result.zip} language={language} t={t} />

      <p className="text-muted">{t.disclaimer}</p>
    </div>
  );
}
