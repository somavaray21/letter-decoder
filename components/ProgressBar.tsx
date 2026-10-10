"use client";

import { useEffect, useState } from "react";
import type { Strings } from "@/lib/i18n";

// Gemini doesn't report progress, so this estimates it from how long a request usually takes.
// It eases toward 95% and never claims to be finished; the parent removes it when the answer arrives.
export function ProgressBar({ expectedMs, mode, t }: { expectedMs: number; mode: "decode" | "translate"; t: Strings }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - start), 100);
    return () => window.clearInterval(id);
  }, []);

  const percent = Math.min(95, Math.round(95 * (1 - Math.exp((-2.2 * elapsed) / expectedMs))));
  const secondsLeft = Math.ceil((expectedMs - elapsed) / 1000);
  const remaining = secondsLeft >= 1 ? t.secondsLeft(secondsLeft) : t.almostDone;
  const stages = t.loadingStages;
  const message =
    mode === "translate" ? t.translating : stages[Math.min(stages.length - 1, Math.floor((percent / 95) * stages.length))];

  return (
    <div className="card space-y-4" aria-busy="true">
      <p className="animate-gentle-pulse font-serif text-2xl font-semibold">{message}</p>
      <div
        role="progressbar"
        aria-label={t.progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%. ${remaining}`}
        className="h-4 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-teal transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-muted">{remaining}</p>
    </div>
  );
}
