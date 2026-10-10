"use client";

import { useEffect, useState } from "react";
import { formatDate, type Strings } from "@/lib/i18n";
import type { DecodeResult, Language } from "@/lib/types";
import { Icon } from "./Icon";

function pickVoice(language: Language): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(language) && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(language))
  );
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
    const utterance = new SpeechSynthesisUtterance(buildScript(result, language, t));
    utterance.lang = language === "es" ? "es-US" : "en-US";
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
    <button type="button" onClick={toggle} aria-pressed={speaking} className="btn btn-primary">
      <Icon name={speaking ? "stop" : "speaker"} />
      <span className="flex-1">{speaking ? t.stopReading : t.readAloud}</span>
    </button>
  );
}
