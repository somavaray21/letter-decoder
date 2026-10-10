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

// Browsers don't say whether a voice is female, so this goes by name: the female voices that ship with
// Apple, Windows, Android and Chrome for each language, plus any voice whose name says "female".
const FEMALE_VOICE =
  /\bfemale\b|samantha|ava|allison|susan|victoria|karen|moira|tessa|fiona|serena|kate|zira|aria|jenny|michelle|emma|sonia|libby|natasha|paulina|monica|mónica|marisol|helena|laura|elvira|dalia|paloma|sabina|ting-ting|tingting|mei-jia|meijia|sin-ji|xiaoxiao|xiaoyi|huihui|yaoyao|amélie|amelie|audrey|aurélie|aurelie|marie|denise|julie|hortense|brigitte|lekha|kalpana|swara|heera|neerja|zariyah|hoda|salma|laila|mariam|amina|blessica|milena|katya|irina|svetlana|dariya|ekaterina|google/i;
const MALE_VOICE =
  /\b(male|daniel|alex|fred|aaron|arthur|thomas|david|mark|guy|ryan|jorge|diego|pablo|juan|yunxi|yunyang|kangkang|henri|claude|nicolas|madhur|hemant|prabhat|naayf|hamed|shakir|angelo|pavel|dmitry|yuri|maxim)\b/i;
// Natural, neural and premium voices sound much less robotic than the basic ones.
const NATURAL_VOICE = /natural|neural|premium|enhanced|online|google/i;

// Picks a pleasant female voice for the language when the device has one: female and natural first,
// then any female voice, then any voice that isn't clearly male, then whatever the device has.
function pickVoice(language: Language): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefixes = language === "tl" ? ["fil", "tl"] : [SPEECH_LANG[language].split("-")[0]];
  const forLanguage = voices.filter((v) => prefixes.some((p) => v.lang.toLowerCase().replace("_", "-").startsWith(p)));
  const female = forLanguage.filter((v) => FEMALE_VOICE.test(v.name) && !MALE_VOICE.test(v.name));
  return (
    female.find((v) => NATURAL_VOICE.test(v.name)) ??
    female[0] ??
    forLanguage.find((v) => !MALE_VOICE.test(v.name)) ??
    forLanguage[0]
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
    // A little slower than normal and a touch higher, which sounds calm and warm with most voices.
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
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
