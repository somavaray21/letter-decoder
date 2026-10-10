"use client";

import { useEffect, useState } from "react";
import type { Strings } from "@/lib/i18n";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// Gemini doesn't report progress, so this estimates it from how long a request usually takes.
// It eases toward 95% and never claims to be finished; the parent removes it when the answer arrives.
// With reduced motion on, the bar jumps between three fixed steps instead of filling smoothly.
export function useEstimatedProgress(expectedMs: number, t: Strings) {
  const [elapsed, setElapsed] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - start), 100);
    return () => window.clearInterval(id);
  }, []);

  const smooth = Math.min(95, Math.round(95 * (1 - Math.exp((-2.2 * elapsed) / expectedMs))));
  const stage = Math.min(2, Math.floor((smooth / 95) * 3));
  const percent = reducedMotion ? [33, 66, 90][stage] : smooth;
  const secondsLeft = Math.ceil((expectedMs - elapsed) / 1000);
  const remaining = secondsLeft >= 1 ? t.secondsLeft(secondsLeft) : t.almostDone;
  return { percent, stage, remaining, reducedMotion };
}

export function ProgressTrack({ percent, label, valueText }: { percent: number; label?: string; valueText?: string }) {
  const a11y = label
    ? {
        role: "progressbar",
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": percent,
        "aria-valuetext": valueText,
      }
    : { "aria-hidden": true };
  return (
    <div {...a11y} className="h-[16px] w-full overflow-hidden rounded-[8px] bg-line">
      <div className="h-full rounded-[8px] bg-teal transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} />
    </div>
  );
}
