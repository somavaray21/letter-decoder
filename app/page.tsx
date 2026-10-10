"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultView } from "@/components/ResultView";
import { TextSizeToggle } from "@/components/TextSizeToggle";
import { DEMO_LETTERS, type DemoLetter } from "@/data/demo";
import { strings } from "@/lib/i18n";
import { resizeImage } from "@/lib/resizeImage";
import type { DecodeRequest, DecodeResult, Language, TranslateRequest } from "@/lib/types";

type ErrorKind = "generic" | "translate" | "rate_limited" | "image" | "missing_key" | "invalid_key";
type PreparedImage = { base64: string; mimeType: string };
type Pending = { mode: "decode" | "translate"; expectedMs: number };
type Failure = { kind: ErrorKind; detail: string | null; retry: (() => void) | null };

// Typical times measured with Gemini Flash-Lite; the progress bar is an estimate based on these.
const EXPECTED_DECODE_MS: Record<Language, number> = { en: 2000, es: 3000 };
const EXPECTED_TRANSLATE_MS = 1500;

const LANGUAGE_OPTIONS = [
  ["en", "English"],
  ["es", "Español"],
] as const;

async function postJson(url: string, body: unknown): Promise<DecodeResult | { error: string; detail?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as DecodeResult;
    const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    return { error: data.error ?? "unknown", detail: data.detail };
  } catch {
    return { error: "network" };
  }
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoLetter, setDemoLetter] = useState<DemoLetter>("eviction");
  const fileInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const t = strings[language];

  useEffect(() => {
    setDemoMode(new URLSearchParams(window.location.search).get("demo") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (result && !pending) resultHeading.current?.focus();
  }, [result, pending]);

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResult(null);
    setFailure(null);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      setImage(await resizeImage(file));
    } catch {
      setImage(null);
      setFailure({ kind: "image", detail: null, retry: null });
    }
  }

  function fail(error: string, detail: string | undefined, fallback: ErrorKind, retry: () => void) {
    const kind: ErrorKind =
      error === "rate_limited" || error === "missing_key" || error === "invalid_key" ? error : fallback;
    const canRetry = kind === fallback || kind === "rate_limited";
    setFailure({ kind, detail: detail ?? null, retry: canRetry ? retry : null });
  }

  async function decode(lang: Language) {
    if (!image && !demoMode) return;
    setFailure(null);
    setPending({ mode: "decode", expectedMs: EXPECTED_DECODE_MS[lang] });
    const body: DecodeRequest = {
      image: image?.base64 ?? "demo",
      mimeType: image?.mimeType ?? "image/jpeg",
      language: lang,
      ...(demoMode ? { demo: demoLetter } : {}),
    };
    const answer = await postJson("/api/decode", body);
    setPending(null);
    if ("error" in answer) {
      fail(answer.error, answer.detail, "generic", () => decode(lang));
      return;
    }
    setResult(answer);
  }

  // Switching language after a result rewrites the text only, without reading the photo again.
  // The page switches language only once the new text has arrived, so the two never disagree.
  async function switchResultLanguage(current: DecodeResult, lang: Language) {
    setFailure(null);
    setPending({ mode: "translate", expectedMs: EXPECTED_TRANSLATE_MS });
    const answer = demoMode
      ? await postJson("/api/decode", { image: "demo", mimeType: "image/jpeg", language: lang, demo: demoLetter })
      : await postJson("/api/translate", { result: current, language: lang } satisfies TranslateRequest);
    setPending(null);
    if ("error" in answer) {
      fail(answer.error, answer.detail, "translate", () => switchResultLanguage(current, lang));
      return;
    }
    setResult(answer);
    setLanguage(lang);
  }

  function changeLanguage(lang: Language) {
    if (lang === language || pending) return;
    if (result) {
      void switchResultLanguage(result, lang);
    } else {
      setLanguage(lang);
    }
  }

  function startOver() {
    window.speechSynthesis?.cancel();
    setResult(null);
    setImage(null);
    setPreviewUrl(null);
    setFailure(null);
  }

  const errorMessages: Record<ErrorKind, string> = {
    generic: t.errorGeneric,
    translate: t.errorTranslate,
    rate_limited: t.errorRateLimited,
    image: t.errorImage,
    missing_key: t.errorMissingKey,
    invalid_key: t.errorInvalidKey,
  };
  const canDecode = (image !== null || demoMode) && !pending;

  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pb-16 pt-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold sm:text-4xl">{t.appName}</h1>
          <p className="mt-2 text-lg text-muted">{t.tagline}</p>
        </div>
        <TextSizeToggle t={t} />
      </header>

      <fieldset className="mb-8">
        <legend className="mb-2 font-bold">{t.languageLabel}</legend>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGE_OPTIONS.map(([code, label]) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={language === code}
              disabled={pending !== null}
              onClick={() => changeLanguage(code)}
              className={`btn sm:w-full ${language === code ? "btn-primary" : "btn-secondary"} disabled:opacity-60`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {demoMode && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-teal bg-card p-4">
          <p className="font-bold">{t.demoBanner}</p>
          <label htmlFor="demo-letter" className="mt-2 block font-bold">
            {t.demoPick}
          </label>
          <select
            id="demo-letter"
            value={demoLetter}
            onChange={(e) => setDemoLetter(e.target.value as DemoLetter)}
            className="mt-1 min-h-14 w-full rounded-[14px] border-2 border-line bg-card px-3 text-lg"
          >
            {DEMO_LETTERS.map((key) => (
              <option key={key} value={key}>
                {t.letterTypes[key]}
              </option>
            ))}
          </select>
        </div>
      )}

      {!result && !pending && (
        <section className="space-y-5">
          <input
            ref={fileInput}
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChosen}
            className="sr-only"
          />
          {!image && (
            <label
              htmlFor="photo"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInput.current?.click();
                }
              }}
              className="btn btn-primary min-h-20 cursor-pointer text-xl sm:w-full"
            >
              <span aria-hidden="true">📷</span> {t.takePhoto}
            </label>
          )}
          {!image && <p className="-mt-2 text-center text-muted">{t.takePhotoHint}</p>}

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              src={previewUrl}
              alt={t.previewAlt}
              className="max-h-96 w-full rounded-2xl border border-line bg-card object-contain"
            />
          )}

          {canDecode && (
            <button type="button" onClick={() => decode(language)} className="btn btn-primary min-h-20 text-xl sm:w-full">
              {t.decode}
            </button>
          )}

          {image && (
            <label
              htmlFor="photo"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInput.current?.click();
                }
              }}
              className="btn btn-secondary cursor-pointer sm:w-full"
            >
              {t.changePhoto}
            </label>
          )}

          <p className="text-muted">
            <span aria-hidden="true">🔒 </span>
            {t.privacy}
          </p>
        </section>
      )}

      <div aria-live="polite" className="space-y-6">
        {pending && <ProgressBar key={pending.mode} expectedMs={pending.expectedMs} mode={pending.mode} t={t} />}
        {failure && !pending && (
          <div role="alert" className="mt-6 space-y-3 rounded-2xl border-2 border-high bg-high-bg p-5 text-lg">
            <p className="font-bold text-ink">{errorMessages[failure.kind]}</p>
            {failure.detail && <p className="break-words font-mono text-sm text-muted">{failure.detail}</p>}
            {failure.retry && (
              <button type="button" onClick={failure.retry} className="btn btn-primary">
                {t.tryAgain}
              </button>
            )}
          </div>
        )}
      </div>

      {result && !pending && (
        <div className="mt-6">
          <h2 ref={resultHeading} tabIndex={-1} className="sr-only">
            {t.whatItIs}
          </h2>
          <ResultView result={result} language={language} t={t} />
          <button type="button" onClick={startOver} className="btn btn-secondary mt-8 sm:w-full">
            {t.startOver}
          </button>
        </div>
      )}
    </main>
  );
}
