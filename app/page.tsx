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
import { PdfTooLargeError, prepareDocument, type DocumentKind } from "@/lib/resizeImage";
import type { DecodeRequest, DecodeResult, Language, LetterImage, TranslateRequest } from "@/lib/types";

type ErrorKind = "generic" | "translate" | "rate_limited" | "image" | "missing_key" | "invalid_key";
// One uploaded attachment is one document, explained on its own; a PDF keeps all its pages in one document.
// Each holds the original file's name, a blob: URL to show it, and what is sent to Gemini (a shrunk JPEG or the PDF).
// All of it lives in page state only and is dropped on "Decode another letter".
type Doc = { name: string; url: string; kind: DocumentKind; payload: LetterImage };
// What came back for each document, in upload order.
type Outcome =
  | { status: "done"; result: DecodeResult; chat: ChatEntry[] }
  | { status: "failed"; kind: ErrorKind }
  | { status: "retrying" };
type Pending = { mode: "decode" | "translate"; expectedMs: number };
type Failure = { kind: ErrorKind; detail: string | null; retry: (() => void) | null };

// Typical times measured with Gemini Flash-Lite; the progress bar is an estimate based on these.
// English is one call; other languages add a translation call. Documents are read at the same time,
// so several add only about a second; a PDF takes about two seconds longer than a photo.
const MAX_DOCUMENTS = 8;
const expectedDecodeMs = (language: Language, docs: Doc[]) =>
  (language === "en" ? 2000 : 3000) + (docs.length > 1 ? 1000 : 0) + (docs.some((d) => d.kind === "pdf") ? 2000 : 0);

function errorKind(error: string, fallback: ErrorKind): ErrorKind {
  return error === "rate_limited" || error === "missing_key" || error === "invalid_key" ? error : fallback;
}
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

// A hidden file input plus a label styled as a button, so choosing files works with the keyboard too.
// Several photos or PDFs can be chosen at once; each one is its own document.
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
        accept="image/*,application/pdf"
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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  // One entry per document once decoded. Letter chat questions and answers live here too, only in page state,
  // for the chat and the printed summary.
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
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

  // Blob URLs are freed when documents are removed (see dropDocs); this frees whatever is left when the page closes.
  const docsRef = useRef(docs);
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);
  useEffect(() => () => docsRef.current.forEach((d) => URL.revokeObjectURL(d.url)), []);

  // Each screen change moves focus to its heading, so screen-reader and keyboard users land on the new content.
  const screenKey = pending?.mode ?? (failure && !outcomes ? "failure" : outcomes ? "result" : docs.length ? "photo" : "start");
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (screenKey === "start" || screenKey === "translate") return;
    main.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [screenKey]);

  function dropDocs(dropped: Doc[]) {
    dropped.forEach((d) => URL.revokeObjectURL(d.url));
  }

  // Reads the chosen files into documents. "replace" starts over; "add" puts them after the documents already there.
  // Files that can't be read are skipped with a note, and the readable ones are kept.
  async function readFiles(event: React.ChangeEvent<HTMLInputElement>, mode: "replace" | "add") {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const kept = mode === "add" ? docs : [];
    const chosen = files.slice(0, MAX_DOCUMENTS - kept.length);
    const prepared = await Promise.allSettled(chosen.map((file) => prepareDocument(file)));
    const added: Doc[] = [];
    let problem: string | null = files.length > chosen.length ? t.tooManyDocuments(MAX_DOCUMENTS) : null;
    prepared.forEach((p, i) => {
      if (p.status === "fulfilled") {
        added.push({ name: chosen[i].name, url: URL.createObjectURL(chosen[i]), ...p.value });
      } else {
        problem = p.reason instanceof PdfTooLargeError ? t.pdfTooLarge : t.errorImage;
      }
    });
    setNotice(problem);
    if (mode === "replace") {
      dropDocs(docs);
      setOutcomes(null);
    }
    setFailure(null);
    setDocs([...kept, ...added]);
  }

  const photoHeading = useRef<HTMLHeadingElement>(null);
  function removeDoc(index: number) {
    dropDocs([docs[index]]);
    setNotice(null);
    setDocs(docs.filter((_, i) => i !== index));
    // The Remove button that had focus is gone, so put focus back on the screen's heading.
    photoHeading.current?.focus();
  }

  function fail(error: string, detail: string | undefined, fallback: ErrorKind, retry: () => void) {
    const kind = errorKind(error, fallback);
    const canRetry = kind === fallback || kind === "rate_limited";
    setFailure({ kind, detail: detail ?? null, retry: canRetry ? retry : null });
  }

  function decodeOne(doc: Doc | null, lang: Language) {
    const body: DecodeRequest = {
      images: doc ? [doc.payload] : [],
      language: lang,
      ...(demoMode ? { demo: demoLetter } : {}),
    };
    return postJson("/api/decode", body);
  }

  // Every document is read on its own, at the same time. If all of them fail, the error screen shows;
  // otherwise each failed document gets its own "Try again" on the results page.
  async function decode(lang: Language) {
    if (docs.length === 0 && !demoMode) return;
    setFailure(null);
    setNotice(null);
    setPending({ mode: "decode", expectedMs: expectedDecodeMs(lang, docs) });
    const targets: (Doc | null)[] = demoMode ? [null] : docs;
    const answers = await Promise.all(targets.map((doc) => decodeOne(doc, lang)));
    setPending(null);
    if (answers.every((a) => "error" in a)) {
      const first = answers[0] as { error: string; detail?: string };
      fail(first.error, first.detail, "generic", () => decode(lang));
      return;
    }
    setOutcomes(
      answers.map((a): Outcome => ("error" in a ? { status: "failed", kind: errorKind(a.error, "generic") } : { status: "done", result: a, chat: [] })),
    );
  }

  async function retryDoc(index: number) {
    setOutcomes((prev) => prev && prev.map((o, i) => (i === index ? { status: "retrying" } : o)));
    const answer = await decodeOne(demoMode ? null : docs[index], language);
    const next: Outcome = "error" in answer ? { status: "failed", kind: errorKind(answer.error, "generic") } : { status: "done", result: answer, chat: [] };
    setOutcomes((prev) => prev && prev.map((o, i) => (i === index ? next : o)));
  }

  function addChat(index: number, entry: ChatEntry) {
    setOutcomes((prev) => prev && prev.map((o, i) => (i === index && o.status === "done" ? { ...o, chat: [...o.chat, entry] } : o)));
  }

  // Switching language after a result rewrites the text only, without reading the files again.
  // The page switches language right away and shows placeholders until the new text arrives;
  // if any document fails, it goes back to the old language with the old results.
  async function switchResultLanguage(current: Outcome[], from: Language, to: Language) {
    setFailure(null);
    setLanguage(to);
    setPending({ mode: "translate", expectedMs: EXPECTED_TRANSLATE_MS });
    const answers = await Promise.all(
      current.map((o) =>
        o.status !== "done"
          ? null
          : demoMode
            ? postJson("/api/decode", { images: [], language: to, demo: demoLetter } satisfies DecodeRequest)
            : postJson("/api/translate", { result: o.result, language: to } satisfies TranslateRequest),
      ),
    );
    setPending(null);
    const error = answers.find((a) => a && "error" in a) as { error: string; detail?: string } | undefined;
    if (error) {
      setLanguage(from);
      fail(error.error, error.detail, "translate", () => switchResultLanguage(current, from, to));
      return;
    }
    setOutcomes(current.map((o, i) => (o.status === "done" ? { ...o, result: answers[i] as DecodeResult } : o)));
  }

  function changeLanguage(lang: Language) {
    if (lang === language || pending) return;
    if (outcomes) {
      void switchResultLanguage(outcomes, language, lang);
    } else {
      setLanguage(lang);
    }
  }

  function startOver() {
    window.speechSynthesis?.cancel();
    setOutcomes(null);
    dropDocs(docs);
    setDocs([]);
    setNotice(null);
    setFailure(null);
  }

  const showFailureOnly = failure !== null && !outcomes && !pending;
  const showPreferences = pending?.mode !== "decode" && !showFailureOnly && docs.length === 0;
  const onRetakePhoto = (e: React.ChangeEvent<HTMLInputElement>) => readFiles(e, "replace");
  const printable = (outcomes ?? []).flatMap((o) => (o.status === "done" ? [{ result: o.result, chat: o.chat }] : []));

  const noticeBanner = notice && (
    <div role="status" className="banner border-medium bg-medium-bg">
      <Icon name="info" className="text-medium" />
      <p>{notice}</p>
    </div>
  );

  // The explanation of one document: its summary, its file, deadlines, steps, contacts and chat.
  function documentResult(outcome: Outcome, index: number, nested: boolean) {
    const doc = docs[index];
    const H = nested ? "h3" : "h2";
    if (outcome.status !== "done") {
      return (
        <section role={outcome.status === "failed" ? "alert" : "status"} className="card">
          {outcome.status === "retrying" ? (
            <p className="animate-gentle-pulse">{t.loading}</p>
          ) : (
            <>
              <p>{outcome.kind === "rate_limited" ? t.errorRateLimited : outcome.kind === "generic" ? t.docFailed : t.errorTitle}</p>
              {doc && <LetterPages files={[doc]} t={t} numberFrom={index + 1} />}
              <button type="button" onClick={() => retryDoc(index)} className="btn btn-primary">
                {t.tryAgain}
              </button>
            </>
          )}
        </section>
      );
    }
    return (
      <>
        <ResultView
          result={outcome.result}
          language={language}
          isDemo={demoMode}
          t={t}
          nested={nested}
          letterPages={
            doc && (
              <section aria-label={t.yourLetter} className="card">
                <H className="heading">{t.yourLetter}</H>
                <p className="text-muted">{t.yourLetterIntro}</p>
                <LetterPages files={[doc]} t={t} numberFrom={index + 1} />
              </section>
            )
          }
        />
        {outcome.result.fullText.trim() && (
          <LetterChat
            fullText={outcome.result.fullText}
            entries={outcome.chat}
            onAnswer={(entry) => addChat(index, entry)}
            language={language}
            t={t}
            nested={nested}
          />
        )}
      </>
    );
  }

  let content: React.ReactNode;
  if (pending?.mode === "decode") {
    content = <DecodingCard expectedMs={pending.expectedMs} t={t} />;
  } else if (showFailureOnly && failure) {
    content = <FailureCard failure={failure} t={t} onRetakePhoto={onRetakePhoto} onStartOver={startOver} />;
  } else if (pending?.mode === "translate" && outcomes) {
    content = <TranslatingView expectedMs={pending.expectedMs} t={t} />;
  } else if (outcomes) {
    const total = outcomes.length;
    content = (
      <>
        {failure && <FailureCard failure={failure} t={t} onRetakePhoto={onRetakePhoto} />}
        {total === 1 ? (
          documentResult(outcomes[0], 0, false)
        ) : (
          <>
            <section aria-labelledby="documents-title" className="card">
              <h2 id="documents-title" tabIndex={-1} className="heading">
                {t.foundDocuments(total)}
              </h2>
              <p className="text-muted">{t.foundDocumentsIntro}</p>
              <ol className="flex flex-col gap-[12px]">
                {outcomes.map((o, i) => (
                  <li key={i}>
                    <a href={`#document-${i + 1}`} className="btn btn-secondary justify-start text-start">
                      <span className="flex-1">
                        {t.documentLabel(i + 1)}
                        {o.status === "done" && `: ${t.letterTypes[o.result.letterType]}`}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
            {outcomes.map((o, i) => (
              <section
                key={i}
                id={`document-${i + 1}`}
                tabIndex={-1}
                aria-labelledby={`document-${i + 1}-title`}
                className="flex scroll-mt-[16px] flex-col gap-[32px]"
              >
                <div className="flex flex-col gap-[4px] rounded-[16px] bg-teal p-[20px] text-on-teal">
                  <h2 id={`document-${i + 1}-title`} className="heading">
                    {t.documentOf(i + 1, total)}
                  </h2>
                  {o.status === "done" ? (
                    <p className="font-bold">
                      {t.letterTypes[o.result.letterType]}
                      {o.result.sender && ` · ${o.result.sender}`}
                    </p>
                  ) : (
                    docs[i] && (
                      <p dir="auto" className="truncate">
                        {docs[i].name}
                      </p>
                    )
                  )}
                </div>
                {documentResult(o, i, true)}
              </section>
            ))}
          </>
        )}
        <button type="button" onClick={startOver} className="btn btn-secondary">
          <Icon name="image" />
          <span className="flex-1">{t.startOver}</span>
        </button>
      </>
    );
  } else if (docs.length > 0) {
    content = (
      <>
        <div className="flex flex-col gap-[8px]">
          <h2 ref={photoHeading} tabIndex={-1} className="heading">
            {t.photoReady(docs.length)}
          </h2>
          <p className="text-muted">
            {t.docCount(docs.length)}
            {docs.length > 1 && ` · ${t.docsNote}`}
          </p>
        </div>
        {noticeBanner}
        <LetterPages files={docs} t={t} onRemove={removeDoc} />
        {docs.length < MAX_DOCUMENTS && (
          <PhotoPicker id="photo-add" onChange={(e) => readFiles(e, "add")} className="btn btn-secondary">
            <Icon name="upload" />
            <span className="flex-1">{t.addDocument}</span>
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
        {noticeBanner}
        <div className="flex flex-col gap-[12px]">
          <PhotoPicker id="photo-upload" onChange={(e) => readFiles(e, "replace")} className="btn btn-primary">
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
      {printable.length > 0 && !pending && <PrintSummary documents={printable} language={language} t={t} />}
    </>
  );
}
