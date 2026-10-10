"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { FlatLetterIllustration } from "@/components/Illustrations";
import { DecodingCard, TranslatingView } from "@/components/Loading";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { ResultView } from "@/components/ResultView";
import { DEMO_LETTERS, type DemoLetter } from "@/data/demo";
import { strings, type Strings } from "@/lib/i18n";
import { resizeImage } from "@/lib/resizeImage";
import type { DecodeRequest, DecodeResult, Language, TranslateRequest } from "@/lib/types";

type ErrorKind = "generic" | "translate" | "rate_limited" | "image" | "missing_key" | "invalid_key";
type PreparedImage = { base64: string; mimeType: string };
type Pending = { mode: "decode" | "translate"; expectedMs: number };
type Failure = { kind: ErrorKind; detail: string | null; retry: (() => void) | null };

// Typical times measured with Gemini Flash-Lite; the progress bar is an estimate based on these.
const EXPECTED_DECODE_MS: Record<Language, number> = { en: 2000, es: 3000 };
const EXPECTED_TRANSLATE_MS = 1500;

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

// A hidden file input plus a label styled as a button or link, so "Take a photo" works with the keyboard too.
function PhotoPicker({
  id,
  capture,
  onChange,
  className,
  children,
}: {
  id: string;
  capture: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className: string;
  children: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        {...(capture ? { capture: "environment" as const } : {})}
        onChange={onChange}
        tabIndex={-1}
        className="sr-only"
      />
      <label
        htmlFor={id}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        className={className}
      >
        {children}
      </label>
    </>
  );
}

function FailureCard({
  failure,
  t,
  onRetakePhoto,
  onStartOver,
}: {
  failure: Failure;
  t: Strings;
  onRetakePhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartOver?: () => void;
}) {
  const messages: Record<ErrorKind, string> = {
    generic: t.errorGeneric,
    translate: t.errorTranslate,
    rate_limited: t.errorRateLimited,
    image: t.errorImage,
    missing_key: t.errorMissingKey,
    invalid_key: t.errorInvalidKey,
  };
  const unreadable = failure.kind === "generic" || failure.kind === "image";
  const busy = failure.kind === "rate_limited";
  const title = unreadable ? t.errorUnreadableTitle : busy ? t.errorBusyTitle : t.errorTitle;

  return (
    <section role="alert" aria-labelledby="failure-title" className="card">
      {!unreadable && <Icon name={busy ? "clock" : "warning"} size={40} className="text-teal" />}
      <h2 id="failure-title" tabIndex={-1} className="heading">
        {title}
      </h2>
      <p>{messages[failure.kind]}</p>
      {failure.detail && <p className="break-words font-mono text-[0.8rem] text-muted">{failure.detail}</p>}
      {unreadable ? (
        <>
          <div className="flex h-[180px] items-center justify-center rounded-[16px] bg-paper">
            <FlatLetterIllustration />
          </div>
          <p className="text-muted">{t.photoTip}</p>
          <PhotoPicker id="photo-retake" capture onChange={onRetakePhoto} className="btn btn-primary">
            <Icon name="camera" />
            <span className="flex-1">{t.tryAgain}</span>
          </PhotoPicker>
        </>
      ) : failure.retry ? (
        <button type="button" onClick={failure.retry} className="btn btn-primary">
          {t.tryAgain}
        </button>
      ) : (
        onStartOver && (
          <button type="button" onClick={onStartOver} className="btn btn-secondary">
            {t.startOver}
          </button>
        )
      )}
    </section>
  );
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
  const main = useRef<HTMLElement>(null);

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

  // Each screen change moves focus to its heading, so screen-reader and keyboard users land on the new content.
  const screenKey = pending?.mode ?? (failure && !result ? "failure" : result ? "result" : image ? "photo" : "start");
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (screenKey === "start" || screenKey === "translate") return;
    main.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [screenKey]);

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
  // The page switches language right away and shows placeholders until the new text arrives;
  // if that fails, it goes back to the old language with the old result.
  async function switchResultLanguage(current: DecodeResult, from: Language, to: Language) {
    setFailure(null);
    setLanguage(to);
    setPending({ mode: "translate", expectedMs: EXPECTED_TRANSLATE_MS });
    const answer = demoMode
      ? await postJson("/api/decode", { image: "demo", mimeType: "image/jpeg", language: to, demo: demoLetter })
      : await postJson("/api/translate", { result: current, language: to } satisfies TranslateRequest);
    setPending(null);
    if ("error" in answer) {
      setLanguage(from);
      fail(answer.error, answer.detail, "translate", () => switchResultLanguage(current, from, to));
      return;
    }
    setResult(answer);
  }

  function changeLanguage(lang: Language) {
    if (lang === language || pending) return;
    if (result) {
      void switchResultLanguage(result, language, lang);
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

  const showFailureOnly = failure !== null && !result && !pending;
  const showPreferences = pending?.mode !== "decode" && !showFailureOnly && !image;

  let content: React.ReactNode;
  if (pending?.mode === "decode") {
    content = <DecodingCard expectedMs={pending.expectedMs} t={t} />;
  } else if (failure && !result && !pending) {
    content = <FailureCard failure={failure} t={t} onRetakePhoto={onFileChosen} onStartOver={startOver} />;
  } else if (pending?.mode === "translate" && result) {
    content = <TranslatingView target={language} expectedMs={pending.expectedMs} t={t} />;
  } else if (result) {
    content = (
      <>
        {failure && <FailureCard failure={failure} t={t} onRetakePhoto={onFileChosen} />}
        <ResultView result={result} language={language} isDemo={demoMode} t={t} />
        <button type="button" onClick={startOver} className="btn btn-secondary">
          <Icon name="camera" />
          <span className="flex-1">{t.startOver}</span>
        </button>
      </>
    );
  } else if (image) {
    content = (
      <>
        <h2 tabIndex={-1} className="heading">
          {t.photoReady}
        </h2>
        {previewUrl && (
          <div className="rounded-[16px] bg-line p-[20px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={previewUrl} alt={t.previewAlt} className="max-h-[480px] w-full rounded-[4px] border border-muted bg-card object-contain" />
          </div>
        )}
        <PhotoPicker id="photo-change" capture={false} onChange={onFileChosen} className="btn btn-secondary">
          <Icon name="image" />
          <span className="flex-1">{t.changePhoto}</span>
        </PhotoPicker>
        <button type="button" onClick={() => decode(language)} className="btn btn-primary">
          {t.decode}
        </button>
      </>
    );
  } else if (demoMode) {
    content = (
      <>
        <div role="note" className="banner">
          <Icon name="info" className="text-teal" />
          <p>{t.demoBanner}</p>
        </div>
        <section aria-labelledby="demo-title" className="card">
          <h2 id="demo-title" className="heading">
            {t.demoTitle}
          </h2>
          <p>{t.demoIntro}</p>
          <div className="flex flex-col gap-[12px]">
            <label htmlFor="demo-letter" className="font-bold">
              {t.demoPick}
            </label>
            <div className="relative">
              <select
                id="demo-letter"
                value={demoLetter}
                onChange={(e) => setDemoLetter(e.target.value as DemoLetter)}
                className="min-h-[56px] w-full cursor-pointer appearance-none rounded-[14px] border-2 border-teal bg-card py-3 pl-4 pr-12 text-[1.1111rem] font-bold text-ink"
              >
                {DEMO_LETTERS.map((key) => (
                  <option key={key} value={key}>
                    {t.letterTypes[key]}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-teal" />
            </div>
          </div>
          <button type="button" onClick={() => decode(language)} className="btn btn-primary">
            {t.decode}
          </button>
        </section>
      </>
    );
  } else {
    content = (
      <div className="flex flex-col gap-[24px]">
        <p>{t.tagline}</p>
        <PhotoPicker id="photo-camera" capture onChange={onFileChosen} className="btn btn-primary">
          <Icon name="camera" />
          <span className="flex-1">{t.takePhoto}</span>
        </PhotoPicker>
        <PhotoPicker
          id="photo-library"
          capture={false}
          onChange={onFileChosen}
          className="flex min-h-[56px] cursor-pointer items-center self-start rounded-[4px] py-[10px] text-teal underline underline-offset-4"
        >
          {t.takePhotoHint}
        </PhotoPicker>
        <p className="flex items-start gap-[12px] text-muted">
          <Icon name="lock" className="mt-0.5 text-teal" />
          <span>{t.privacy}</span>
        </p>
      </div>
    );
  }

  return (
    <main ref={main} className="mx-auto flex w-full max-w-[640px] flex-col gap-[32px] px-[20px] pb-[40px] pt-[32px]">
      <h1 className="heading">{t.appName}</h1>
      {showPreferences && (
        <ReadingPreferences language={language} onLanguageChange={changeLanguage} languageDisabled={pending !== null} t={t} />
      )}
      {content}
    </main>
  );
}
