"use client";

import { useEffect, useState } from "react";
import { formatDate, type Strings } from "@/lib/i18n";
import type { DecodeResult, Language } from "@/lib/types";
import { Icon } from "./Icon";

// Voice language for each app language. Tagalog voices are listed as Filipino ("fil").
const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  es: "es-US",
  zh: "zh-CN",
  fr: "fr-FR",
  hi: "hi-IN",
  ar: "ar-SA",
  tl: "fil-PH",
  ru: "ru-RU",
};

function pickVoice(language: Language): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefixes = language === "tl" ? ["fil", "tl"] : [SPEECH_LANG[language].split("-")[0]];
  const matches = (v: SpeechSynthesisVoice) => prefixes.some((p) => v.lang.toLowerCase().replace("_", "-").startsWith(p));
  return voices.find((v) => matches(v) && v.localService) ?? voices.find(matches);
}

function buildScript(result: DecodeResult, language: Language, t: Strings): string {
  const parts = [result.summary];
  for (const d of result.deadlines) {
    parts.push(`${formatDate(d.date, language)}: ${d.what}.`);
  }
  parts.push(`${t.steps}.`);
  result.steps.forEach((step, i) => parts.push(`${i + 1}. ${step}`));
  return parts.join(" ");
}

export function ReadAloudButton({ result, language, t }: { result: DecodeResult; language: Language; t: Strings }) {
  return <SpeakButton text={buildScript(result, language, t)} language={language} t={t} />;
}

// Reads any text aloud. Starting one button stops whatever another button was reading.
export function SpeakButton({
  text,
  language,
  t,
  variant = "primary",
}: {
  text: string;
  language: Language;
  t: Strings;
  variant?: "primary" | "secondary";
}) {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    // Voices load asynchronously in some browsers; touching the list starts that.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  if (!supported) return <p className="text-muted">{t.speechUnsupported}</p>;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[language];
    const voice = pickVoice(language);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={speaking} className={`btn btn-${variant}`}>
      <Icon name={speaking ? "stop" : "speaker"} />
      <span className="flex-1">{speaking ? t.stopReading : t.readAloud}</span>
    </button>
  );
}
