"use client";

import { useState } from "react";
import { MAX_HISTORY_TURNS, MAX_QUESTION_LENGTH } from "@/lib/schema";
import type { Strings } from "@/lib/i18n";
import type { AskRequest, AskResponse, Language } from "@/lib/types";
import { Icon } from "./Icon";
import { SpeakButton } from "./ReadAloudButton";

export type ChatEntry = { question: string } & AskResponse;

// "Questions about your letter?" chat. Answers come only from the letter's transcribed text,
// which stays in page state; the questions and answers are kept by the page so they can be printed.
export function LetterChat({
  fullText,
  entries,
  onAnswer,
  language,
  t,
}: {
  fullText: string;
  entries: ChatEntry[];
  onAnswer: (entry: ChatEntry) => void;
  language: Language;
  t: Strings;
}) {
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || asking) return;
    setAsking(question);
    setError(null);
    setDraft("");
    const body: AskRequest = {
      fullText,
      question,
      history: entries.slice(-MAX_HISTORY_TURNS).map((e) => ({ question: e.question, answer: e.answer.slice(0, 2_000) })),
      language,
    };
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<AskResponse> & { error?: string };
      if (res.ok && typeof data.answer === "string") {
        onAnswer({
          question,
          answer: data.answer,
          sourceQuote: data.sourceQuote ?? null,
          foundInLetter: data.foundInLetter ?? false,
        });
      } else {
        setError(data.error === "rate_limited" ? t.errorRateLimited : t.chatError);
        setDraft(question);
      }
    } catch {
      setError(t.chatError);
      setDraft(question);
    } finally {
      setAsking(null);
    }
  }

  return (
    <section aria-labelledby="chat-title" className="card">
      <h2 id="chat-title" className="heading">
        {t.chatTitle}
      </h2>
      <p className="text-muted">{t.chatIntro}</p>

      {(entries.length > 0 || asking) && (
        <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-[24px]">
          {entries.map((entry, i) => (
            <div key={i} className="flex flex-col gap-[12px]">
              <QuestionBubble text={entry.question} t={t} />
              <div className="flex max-w-[90%] flex-col gap-[16px] self-start rounded-[16px] rounded-bl-[4px] border border-line bg-paper p-[16px]">
                <p>
                  <span className="sr-only">{t.answerFrom}: </span>
                  {entry.answer}
                </p>
                {!entry.foundInLetter && (
                  <p className="inline-flex items-center gap-[8px] self-start rounded-full bg-medium-bg px-[12px] py-[4px] font-bold text-medium">
                    <Icon name="info" size={20} />
                    {t.notInLetter}
                  </p>
                )}
                {entry.sourceQuote && (
                  <p className="text-[0.8889rem] italic text-muted">
                    {t.letterSays}: ‘{entry.sourceQuote}’
                  </p>
                )}
                <SpeakButton text={entry.answer} language={language} t={t} variant="secondary" />
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex flex-col gap-[12px]">
              <QuestionBubble text={asking} t={t} />
              <p className="animate-gentle-pulse self-start rounded-[16px] rounded-bl-[4px] border border-line bg-paper p-[16px] text-muted">
                {t.asking}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="banner border-medium bg-medium-bg">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-[12px]">
        <p className="font-bold">{t.suggestedLabel}</p>
        {t.suggestedQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            disabled={asking !== null}
            className="btn btn-secondary justify-start text-start"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
        className="flex flex-col gap-[12px]"
      >
        <label htmlFor="chat-question" className="font-bold">
          {t.questionLabel}
        </label>
        <input
          id="chat-question"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.questionPlaceholder}
          maxLength={MAX_QUESTION_LENGTH}
          enterKeyHint="send"
          autoComplete="off"
          className="min-h-[56px] w-full rounded-[14px] border-2 border-muted bg-card px-4 py-3 text-ink placeholder:text-muted"
        />
        <button type="submit" disabled={asking !== null || !draft.trim()} className="btn btn-primary">
          <Icon name="send" className="rtl:-scale-x-100" />
          <span className="flex-1">{t.send}</span>
        </button>
      </form>
    </section>
  );
}

function QuestionBubble({ text, t }: { text: string; t: Strings }) {
  return (
    <p className="max-w-[90%] self-end rounded-[16px] rounded-br-[4px] bg-teal p-[16px] text-on-teal">
      <span className="sr-only">{t.you}: </span>
      {text}
    </p>
  );
}
