"use client";

import { useEffect, useState } from "react";
import type { Strings } from "@/lib/i18n";

const STORAGE_KEY = "letter-decoder:text-size";

export function TextSizeToggle({ t }: { t: Strings }) {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    try {
      setLarge(localStorage.getItem(STORAGE_KEY) === "large");
    } catch {
      // Storage can be blocked; the default size still works.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textSize = large ? "large" : "normal";
    try {
      localStorage.setItem(STORAGE_KEY, large ? "large" : "normal");
    } catch {}
  }, [large]);

  return (
    <div role="group" aria-label={t.textSize} className="flex rounded-full border-2 border-neutral-900 bg-white p-1">
      {[false, true].map((value) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={large === value}
          onClick={() => setLarge(value)}
          className={`min-h-11 rounded-full px-3 font-bold ${large === value ? "bg-neutral-900 text-white" : "text-neutral-900"}`}
        >
          <span aria-hidden="true" className={value ? "text-xl" : "text-sm"}>A</span>
          <span className="sr-only">{value ? t.textLarge : t.textNormal}</span>
        </button>
      ))}
    </div>
  );
}
