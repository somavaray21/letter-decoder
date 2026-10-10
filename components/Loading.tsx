"use client";

import type { Strings } from "@/lib/i18n";
import { Icon } from "./Icon";
import { EnvelopeIllustration } from "./Illustrations";
import { ProgressTrack, useEstimatedProgress } from "./ProgressBar";

// "Reading your letter…" card shown while a photo is decoded. The heading and note follow the three stages.
export function DecodingCard({ expectedMs, t }: { expectedMs: number; t: Strings }) {
  const { percent, stage, remaining, reducedMotion } = useEstimatedProgress(expectedMs, t);

  return (
    <section aria-busy="true" aria-labelledby="loading-title" className="card">
      <div className="animate-gentle-pulse flex h-[180px] items-center justify-center rounded-[16px] bg-paper">
        <EnvelopeIllustration />
      </div>
      <h2 id="loading-title" tabIndex={-1} className="heading" aria-live="polite">
        {t.loadingStages[stage]}
      </h2>
      <div className="flex flex-col gap-[12px]">
        <ProgressTrack percent={percent} label={t.progressLabel} valueText={`${percent}%. ${remaining}`} />
        <p className="text-muted">{remaining}</p>
      </div>
      {reducedMotion && <p className="text-muted">{t.reducedMotion}</p>}
      <p className="text-muted">{t.loadingDetails[stage]}</p>
    </section>
  );
}

// While a result is being rewritten in the other language, each section shows a placeholder with a bar.
export function TranslatingView({ expectedMs, t }: { expectedMs: number; t: Strings }) {
  const { percent, remaining } = useEstimatedProgress(expectedMs, t);
  const sections = [t.whatItIs, t.deadlines, t.steps, t.whoToCall];

  return (
    <div aria-busy="true" className="flex flex-col gap-[32px]">
      <div role="status" className="banner">
        <Icon name="info" className="text-teal" />
        <p>
          {t.translating} {t.translatingNote}
        </p>
      </div>
      {sections.map((title, i) => (
        <section key={title} className="card">
          <h2 className="heading">{title}</h2>
          <p>{t.translating}</p>
          <ProgressTrack
            percent={percent}
            label={i === 0 ? t.progressLabel : undefined}
            valueText={`${percent}%. ${remaining}`}
          />
        </section>
      ))}
    </div>
  );
}
