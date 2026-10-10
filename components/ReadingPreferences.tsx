"use client";

import { useEffect, useState } from "react";
import { LANGUAGE_NAMES, LANGUAGE_ORDER, type Strings } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { Icon } from "./Icon";

// The layout's inline script applies the saved choices before first paint; these keys must match it.
export const TEXT_SIZE_KEY = "documate:text-size";
export const THEME_KEY = "documate:theme";

type TextSize = "normal" | "large";
type Theme = "light" | "dark";

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
}

// Text size and appearance live on <html> so they survive this component unmounting between screens.
function useRootSetting<T extends string>(attr: "textSize" | "theme", key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue((document.documentElement.dataset[attr] as T | undefined) ?? fallback);
  }, [attr, fallback]);

  function choose(next: T) {
    document.documentElement.dataset[attr] = next;
    save(key, next);
    setValue(next);
  }

  return [value, choose] as const;
}

function Setting({ label, children, grid = false }: { label: string; children: React.ReactNode; grid?: boolean }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-[8px]">
      <p aria-hidden="true" className="font-bold">
        {label}
      </p>
      <div className={grid ? "grid grid-cols-2 gap-[8px]" : "flex gap-[8px]"}>{children}</div>
    </div>
  );
}

export function ReadingPreferences({
  language,
  onLanguageChange,
  languageDisabled,
  t,
}: {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  languageDisabled: boolean;
  t: Strings;
}) {
  const [textSize, setTextSize] = useRootSetting<TextSize>("textSize", TEXT_SIZE_KEY, "normal");
  const [theme, setTheme] = useRootSetting<Theme>("theme", THEME_KEY, "light");

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1a1714" : "#faf7f2");
  }, [theme]);

  return (
    <div className="flex flex-col gap-[20px]">
      <Setting label={t.textSize}>
        <button type="button" className="option" aria-pressed={textSize === "normal"} onClick={() => setTextSize("normal")}>
          <span aria-hidden="true">A </span>
          {t.textNormal}
        </button>
        <button type="button" className="option" aria-pressed={textSize === "large"} onClick={() => setTextSize("large")}>
          <span aria-hidden="true" className="text-[1.3333rem]">
            A{" "}
          </span>
          {t.textLarge}
        </button>
      </Setting>

      <Setting label={t.appearance}>
        {(["light", "dark"] as const).map((value) => (
          <button key={value} type="button" className="option" aria-pressed={theme === value} onClick={() => setTheme(value)}>
            <Icon name={value === "light" ? "sun" : "moon"} size={20} className="ms-1" />
            <span className="flex-1">{value === "light" ? t.themeLight : t.themeDark}</span>
          </button>
        ))}
      </Setting>

      {/* Each language is written in its own name and script, so readers can find theirs from any page language. */}
      <Setting label={t.languageLabel} grid>
        {LANGUAGE_ORDER.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            dir="auto"
            className="option"
            aria-pressed={language === code}
            disabled={languageDisabled}
            onClick={() => onLanguageChange(code)}
          >
            {LANGUAGE_NAMES[code]}
          </button>
        ))}
      </Setting>
    </div>
  );
}
