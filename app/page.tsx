"use client";

import { useEffect, useRef, useState } from "react";
import { ResultView } from "@/components/ResultView";
import { TextSizeToggle } from "@/components/TextSizeToggle";
import { DEMO_LETTERS, type DemoLetter } from "@/data/demo";
import { strings } from "@/lib/i18n";
import { resizeImage } from "@/lib/resizeImage";
import type { DecodeRequest, DecodeResult, Language } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";
type ErrorKind = "generic" | "rate_limited" | "image" | "missing_key" | "invalid_key";
type PreparedImage = { base64: string; mimeType: string };

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
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
    if (status === "done") resultHeading.current?.focus();
  }, [status]);

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      setImage(await resizeImage(file));
      setStatus("idle");
    } catch {
      setImage(null);
      setErrorKind("image");
      setStatus("error");
    }
  }

  async function decode(lang: Language) {
    if (!image && !demoMode) return;
    setStatus("loading");
    setErrorDetail(null);
    const body: DecodeRequest = {
      image: image?.base64 ?? "demo",
      mimeType: image?.mimeType ?? "image/jpeg",
      language: lang,
      ...(demoMode ? { demo: demoLetter } : {}),
    };
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        const kind: ErrorKind =
          data.error === "rate_limited" || data.error === "missing_key" || data.error === "invalid_key"
            ? data.error
            : "generic";
        setErrorKind(kind);
        setErrorDetail(data.detail ?? null);
        setStatus("error");
        return;
      }
      setResult((await res.json()) as DecodeResult);
      setStatus("done");
    } catch {
      setErrorKind("generic");
      setErrorDetail(null);
      setStatus("error");
    }
  }

  function changeLanguage(lang: Language) {
    if (lang === language) return;
    setLanguage(lang);
    // Re-explain the same letter in the new language.
    if (result && status !== "loading") void decode(lang);
  }

  function startOver() {
    window.speechSynthesis?.cancel();
    setResult(null);
    setImage(null);
    setPreviewUrl(null);
    setStatus("idle");
  }

  const errorMessages: Record<ErrorKind, string> = {
    generic: t.errorGeneric,
    rate_limited: t.errorRateLimited,
    image: t.errorImage,
    missing_key: t.errorMissingKey,
    invalid_key: t.errorInvalidKey,
  };
  const errorMessage = errorMessages[errorKind];
  const canDecode = (image !== null || demoMode) && status !== "loading";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t.appName}</h1>
          <p className="mt-2 text-xl">{t.tagline}</p>
        </div>
        <TextSizeToggle t={t} />
      </header>

      <fieldset className="mb-6">
        <legend className="mb-2 text-lg font-bold">{t.languageLabel}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["en", "English"],
              ["es", "Español"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={language === code}
              onClick={() => changeLanguage(code)}
              className={`btn border-2 border-neutral-900 ${
                language === code ? "bg-neutral-900 text-white" : "bg-white text-neutral-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {demoMode && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-blue-800 bg-blue-50 p-4">
          <p className="font-semibold">{t.demoBanner}</p>
          <label htmlFor="demo-letter" className="mt-2 block font-bold">
            {t.demoPick}
          </label>
          <select
            id="demo-letter"
            value={demoLetter}
            onChange={(e) => setDemoLetter(e.target.value as DemoLetter)}
            className="mt-1 min-h-12 w-full rounded-lg border-2 border-neutral-900 bg-white px-3 text-lg"
          >
            {DEMO_LETTERS.map((key) => (
              <option key={key} value={key}>
                {t.letterTypes[key]}
              </option>
            ))}
          </select>
        </div>
      )}

      {!result && (
        <section className="space-y-4">
          <input
            ref={fileInput}
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChosen}
            className="sr-only"
          />
          <label
            htmlFor="photo"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            className="btn w-full cursor-pointer bg-blue-800 py-6 text-2xl text-white hover:bg-blue-900"
          >
            <span aria-hidden="true">📷</span> {previewUrl ? t.changePhoto : t.takePhoto}
          </label>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              src={previewUrl}
              alt={t.previewAlt}
              className="max-h-96 w-full rounded-xl border-2 border-neutral-300 object-contain"
            />
          )}

          {canDecode && (
            <button type="button" onClick={() => decode(language)} className="btn w-full bg-green-800 py-5 text-2xl text-white hover:bg-green-900">
              {t.decode}
            </button>
          )}

          <p className="text-base text-neutral-700">
            <span aria-hidden="true">🔒 </span>
            {t.privacy}
          </p>
        </section>
      )}

      <div aria-live="polite" className="mt-6">
        {status === "loading" && (
          <div className="flex items-center gap-4 rounded-xl bg-neutral-100 p-5 text-2xl font-semibold">
            <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-4 border-blue-800 border-t-transparent" />
            {t.loading}
          </div>
        )}
        {status === "error" && (
          <div role="alert" className="space-y-3 rounded-xl border-4 border-red-700 bg-red-50 p-5 text-xl">
            <p>{errorMessage}</p>
            {errorDetail && <p className="break-words font-mono text-sm text-neutral-800">{errorDetail}</p>}
            {(errorKind === "generic" || errorKind === "rate_limited") && (image || demoMode) && (
              <button type="button" onClick={() => decode(language)} className="btn bg-red-700 text-white hover:bg-red-800">
                {t.tryAgain}
              </button>
            )}
          </div>
        )}
      </div>

      {result && status !== "loading" && (
        <div className="mt-2">
          <h2 ref={resultHeading} tabIndex={-1} className="sr-only">
            {t.whatItIs}
          </h2>
          <ResultView result={result} language={language} t={t} />
          <button type="button" onClick={startOver} className="btn mt-8 w-full border-2 border-neutral-900 bg-white text-neutral-900">
            {t.startOver}
          </button>
        </div>
      )}
    </main>
  );
}
