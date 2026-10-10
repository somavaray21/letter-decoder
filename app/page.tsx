"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { FlatLetterIllustration } from "@/components/Illustrations";
import { LetterChat, type ChatEntry } from "@/components/LetterChat";
import { LetterPages } from "@/components/LetterPages";
import { DecodingCard, TranslatingView } from "@/components/Loading";
import { PrintSummary } from "@/components/PrintSummary";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { ResultView } from "@/components/ResultView";
import { DEMO_LETTERS, type DemoLetter } from "@/data/demo";
import { isRightToLeft, strings, type Strings } from "@/lib/i18n";
import { fitLetter, resizeImage } from "@/lib/resizeImage";
import { MAX_PAGES } from "@/lib/schema";
import type { DecodeRequest, DecodeResult, Language, LetterImage, TranslateRequest } from "@/lib/types";

type ErrorKind = "generic" | "translate" | "rate_limited" | "image" | "missing_key" | "invalid_key";
// One page of the letter: the original file, a blob: URL to show it, and the shrunk JPEG sent to Gemini.
// All of it lives in page state only and is dropped on "Decode another letter".
type Page = { file: File; url: string; image: LetterImage };
type Pending = { mode: "decode" | "translate"; expectedMs: number };
type Failure = { kind: ErrorKind; detail: string | null; retry: (() => void) | null };

// Typical times measured with Gemini Flash-Lite; the progress bar is an estimate based on these.
// English is one call; other languages add a translation call. Each extra page adds about a second.
const expectedDecodeMs = (language: Language, pageCount: number) =>
  (language === "en" ? 2000 : 3000) + 1000 * Math.max(0, pageCount - 1);
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

// A hidden file input plus a label styled as a button, so choosing photos works with the keyboard too.
// Several photos can be chosen at once, one per page of the letter.
function PhotoPicker({
  id,
  onChange,
  className,
  children,
}: {
  id: string;
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
        multiple
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
          <PhotoPicker id="photo-retake" onChange={onRetakePhoto} className="btn btn-primary">
            <Icon name="image" />
            <span className="flex-1">{t.chooseClearerPhoto}</span>
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
  const [pages, setPages] = useState<Page[]>([]);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<DecodeResult | null>(null);
  // Letter chat questions and answers, kept only in page state for the chat and the printed summary.
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [demoLetter, setDemoLetter] = useState<DemoLetter>("eviction");
  const main = useRef<HTMLElement>(null);

  const t = strings[language];

  useEffect(() => {
    setDemoMode(new URLSearchParams(window.location.search).get("demo") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRightToLeft(language) ? "rtl" : "ltr";
  }, [language]);

  // Blob URLs are freed when pages are removed (see dropPages); this frees whatever is left when the page closes.
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Each screen change moves focus to its heading, so screen-reader and keyboard users land on the new content.
  const screenKey = pending?.mode ?? (failure && !result ? "failure" : result ? "result" : pages.length ? "photo" : "start");
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (screenKey === "start" || screenKey === "translate") return;
    main.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [screenKey]);

  function dropPages(dropped: Page[]) {
    dropped.forEach((p) => URL.revokeObjectURL(p.url));
  }

  // Reads the chosen photos into pages. "replace" starts a new letter; "add" puts them after the pages already there.
  async function readPhotos(event: React.ChangeEvent<HTMLInputElement>, mode: "replace" | "add") {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const kept = mode === "add" ? pages : [];
    const chosen = files.slice(0, MAX_PAGES - kept.length);
    let images: LetterImage[];
    try {
      images = await Promise.all(chosen.map((file) => resizeImage(file)));
    } catch {
      // A photo the browser can't open. When adding pages, keep the ones already there and say so.
      if (mode === "add") {
        setPageNotice(t.errorImage);
        return;
      }
      dropPages(pages);
      setPages([]);
      setResult(null);
      setChat([]);
      setFailure({ kind: "image", detail: null, retry: null });
      return;
    }
    const added = chosen.map((file, i) => ({ file, url: URL.createObjectURL(file), image: images[i] }));
    setPageNotice(files.length > chosen.length ? t.tooManyPages(MAX_PAGES) : null);
    if (mode === "replace") {
      dropPages(pages);
      setResult(null);
      setChat([]);
    }
    setFailure(null);
    setPages([...kept, ...added]);
  }

  const photoHeading = useRef<HTMLHeadingElement>(null);
  function removePage(index: number) {
    dropPages([pages[index]]);
    setPageNotice(null);
    setPages(pages.filter((_, i) => i !== index));
    // The Remove button that had focus is gone, so put focus back on the screen's heading.
    photoHeading.current?.focus();
  }

  function fail(error: string, detail: string | undefined, fallback: ErrorKind, retry: () => void) {
    const kind: ErrorKind =
      error === "rate_limited" || error === "missing_key" || error === "invalid_key" ? error : fallback;
    const canRetry = kind === fallback || kind === "rate_limited";
    setFailure({ kind, detail: detail ?? null, retry: canRetry ? retry : null });
  }

  async function decode(lang: Language) {
    if (pages.length === 0 && !demoMode) return;
    setFailure(null);
    setPageNotice(null);
    setPending({ mode: "decode", expectedMs: expectedDecodeMs(lang, pages.length) });
    let images: LetterImage[] = [];
    if (pages.length > 0) {
      try {
        images = await fitLetter(
          pages.map((p) => p.file),
          pages.map((p) => p.image),
        );
      } catch {
        setPending(null);
        setFailure({ kind: "image", detail: null, retry: null });
        return;
      }
    }
    const body: DecodeRequest = {
      images,
      language: lang,
      ...(demoMode ? { demo: demoLetter } : {}),
    };
    const answer = await postJson("/api/decode", body);
    setPending(null);
    if ("error" in answer) {
      fail(answer.error, answer.detail, "generic", () => decode(lang));
      return;
    }
    setChat([]);
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
      ? await postJson("/api/decode", { images: [], language: to, demo: demoLetter } satisfies DecodeRequest)
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
    setChat([]);
    dropPages(pages);
    setPages([]);
    setPageNotice(null);
    setFailure(null);
  }

  const showFailureOnly = failure !== null && !result && !pending;
  const showPreferences = pending?.mode !== "decode" && !showFailureOnly && pages.length === 0;
  const onRetakePhoto = (e: React.ChangeEvent<HTMLInputElement>) => readPhotos(e, "replace");

  let content: React.ReactNode;
  if (pending?.mode === "decode") {
    content = <DecodingCard expectedMs={pending.expectedMs} t={t} />;
  } else if (failure && !result && !pending) {
    content = <FailureCard failure={failure} t={t} onRetakePhoto={onRetakePhoto} onStartOver={startOver} />;
  } else if (pending?.mode === "translate" && result) {
    content = <TranslatingView expectedMs={pending.expectedMs} t={t} />;
  } else if (result) {
    content = (
      <>
        {failure && <FailureCard failure={failure} t={t} onRetakePhoto={onRetakePhoto} />}
        <ResultView
          result={result}
          language={language}
          isDemo={demoMode}
          t={t}
          letterPages={
            pages.length > 0 && (
              <section aria-labelledby="letter-pages-title" className="card">
                <h2 id="letter-pages-title" className="heading">
                  {t.yourLetter}
                </h2>
                <p className="text-muted">{t.yourLetterIntro}</p>
                <LetterPages urls={pages.map((p) => p.url)} t={t} />
              </section>
            )
          }
        />
        {result.fullText.trim() && (
          <LetterChat
            fullText={result.fullText}
            entries={chat}
            onAnswer={(entry) => setChat((prev) => [...prev, entry])}
            language={language}
            t={t}
          />
        )}
        <button type="button" onClick={startOver} className="btn btn-secondary">
          <Icon name="image" />
          <span className="flex-1">{t.startOver}</span>
        </button>
      </>
    );
  } else if (pages.length > 0) {
    content = (
      <>
        <div className="flex flex-col gap-[8px]">
          <h2 ref={photoHeading} tabIndex={-1} className="heading">
            {t.photoReady}
          </h2>
          <p className="text-muted">
            {t.pageCount(pages.length)}
            {pages.length > 1 && ` · ${t.pageOrderNote}`}
          </p>
        </div>
        {pageNotice && (
          <div role="status" className="banner border-medium bg-medium-bg">
            <Icon name="info" className="text-medium" />
            <p>{pageNotice}</p>
          </div>
        )}
        <LetterPages urls={pages.map((p) => p.url)} t={t} onRemove={removePage} />
        {pages.length < MAX_PAGES && (
          <PhotoPicker id="photo-add" onChange={(e) => readPhotos(e, "add")} className="btn btn-secondary">
            <Icon name="image" />
            <span className="flex-1">{t.addPages}</span>
          </PhotoPicker>
        )}
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
                className="min-h-[56px] w-full cursor-pointer appearance-none rounded-[14px] border-2 border-teal bg-card py-3 ps-4 pe-12 text-[1.1111rem] font-bold text-ink"
              >
                {DEMO_LETTERS.map((key) => (
                  <option key={key} value={key}>
                    {t.letterTypes[key]}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-teal" />
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
        <div className="flex flex-col gap-[12px]">
          <PhotoPicker id="photo-upload" onChange={(e) => readPhotos(e, "replace")} className="btn btn-primary">
            <Icon name="upload" />
            <span className="flex-1">{t.uploadPhotos}</span>
          </PhotoPicker>
          <p className="text-muted">{t.uploadHint}</p>
        </div>
        <p className="flex items-start gap-[12px] text-muted">
          <Icon name="lock" className="mt-0.5 text-teal" />
          <span>{t.privacy}</span>
        </p>
      </div>
    );
  }

  return (
    <>
      <main ref={main} className="mx-auto flex w-full max-w-[640px] flex-col gap-[32px] px-[20px] pb-[40px] pt-[32px] print:hidden">
        <h1 className="heading">{t.appName}</h1>
        {showPreferences && (
          <ReadingPreferences language={language} onLanguageChange={changeLanguage} languageDisabled={pending !== null} t={t} />
        )}
        {content}
      </main>
      {result && !pending && <PrintSummary result={result} chat={chat} language={language} t={t} />}
    </>
  );
}
