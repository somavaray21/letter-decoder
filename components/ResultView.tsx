"use client";

import { downloadIcs } from "@/lib/calendar";
import { formatDate, formatShortDate, type Strings } from "@/lib/i18n";
import type { DecodeResult, Language } from "@/lib/types";
import { Icon, type IconName } from "./Icon";
import { ReadAloudButton } from "./ReadAloudButton";
import { Resources } from "./Resources";

const URGENCY_STYLES: Record<DecodeResult["urgency"], { className: string; icon: IconName }> = {
  high: { className: "bg-high-bg text-high", icon: "alarm" },
  medium: { className: "bg-medium-bg text-medium", icon: "clock" },
  low: { className: "bg-low-bg text-low", icon: "check" },
};

export function ResultView({
  result,
  language,
  isDemo,
  t,
}: {
  result: DecodeResult;
  language: Language;
  isDemo: boolean;
  t: Strings;
}) {
  const urgency = URGENCY_STYLES[result.urgency];

  return (
    <div className="flex flex-col gap-[32px]">
      {result.confidence === "low" && (
        <div role="alert" className="banner border-medium bg-medium-bg">
          <Icon name="warning" className="text-medium" />
          <p>{t.lowConfidence}</p>
        </div>
      )}

      {isDemo && <p className="text-muted">{t.demoResultNote}</p>}

      <section aria-labelledby="summary-title" className="card">
        <div className="flex flex-col items-start gap-[12px]">
          <p className={`inline-flex max-w-full items-center gap-[8px] rounded-full px-[12px] py-[8px] font-bold leading-[1.4] ${urgency.className}`}>
            <Icon name={urgency.icon} />
            <span className="sr-only">{t.urgencyLabel}: </span>
            {t.urgency[result.urgency]}
          </p>
          <p className="font-bold text-muted">{t.letterTypes[result.letterType]}</p>
        </div>
        <h2 id="summary-title" tabIndex={-1} className="heading">
          {t.whatItIs}
        </h2>
        <p>{result.summary}</p>
        {result.sender && (
          <p className="text-muted">
            {t.from}: {result.sender}
          </p>
        )}
        <ReadAloudButton result={result} language={language} t={t} />
      </section>

      <section aria-labelledby="deadlines-title" className="card">
        <h2 id="deadlines-title" className="heading">
          {t.deadlines}
        </h2>
        {result.deadlines.length === 0 ? (
          <p className="text-muted">{t.noDeadlines}</p>
        ) : (
          <ul className="flex flex-col gap-[24px] divide-y divide-line">
            {result.deadlines.map((d, i) => {
              const short = formatShortDate(d.date, language);
              return (
                <li key={`${d.date}-${i}`} className="flex flex-col gap-[16px] pt-[24px] first:pt-0">
                  <div className="flex items-center gap-[16px]">
                    <div
                      role="img"
                      aria-label={formatDate(d.date, language)}
                      className="flex w-[88px] shrink-0 flex-col items-center rounded-[14px] bg-paper p-[12px]"
                    >
                      <span className="font-bold uppercase leading-[1.4] text-teal">{short.month}</span>
                      <span className="font-serif text-[2rem] leading-[1.2]">{short.day}</span>
                    </div>
                    <p aria-hidden="true">
                      <span className="block capitalize">{short.weekday}</span>
                      <span className="block">{short.year}</span>
                    </p>
                  </div>
                  <p>{d.what}</p>
                  {d.sourceQuote && (
                    <p className="italic text-muted">
                      {t.letterSays}: ‘{d.sourceQuote}’
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadIcs(d.date, d.what, `${result.sender}\n${d.sourceQuote}`)}
                    className="btn btn-secondary"
                  >
                    <Icon name="calendar" />
                    <span className="flex-1">{t.addToCalendar}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="steps-title" className="card">
        <h2 id="steps-title" className="heading">
          {t.steps}
        </h2>
        <ol className="flex flex-col gap-[24px]">
          {result.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-[12px]">
              <span
                aria-hidden="true"
                className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-teal text-[1.1111rem] font-bold text-on-teal"
              >
                {i + 1}
              </span>
              <span className="sr-only">{i + 1}. </span>
              <span className="min-w-0 flex-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <Resources letterType={result.letterType} zip={result.zip} language={language} t={t} />

      <p className="text-muted">{t.disclaimer}</p>
    </div>
  );
}
