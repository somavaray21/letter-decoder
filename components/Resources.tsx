import { useId } from "react";
import resources from "@/data/resources.json";
import type { Strings } from "@/lib/i18n";
import type { Language, LetterContact, LetterType, Resource } from "@/lib/types";
import { Icon } from "./Icon";

// A resource serves a ZIP when it lists no ZIPs (works anywhere) or one of its entries is a prefix of the ZIP.
function servesZip(resource: Resource, zip: string): boolean {
  if (!resource.zips || resource.zips.length === 0) return true;
  if (!zip) return false;
  return resource.zips.some((prefix) => zip.startsWith(prefix));
}

// Help for this kind of letter near this ZIP. Local, letter-specific help first; general help (like 211) last.
export function matchResources(letterType: LetterType, zip: string): Resource[] {
  return (resources as Resource[])
    .filter((r) => (r.letterTypes.includes(letterType) || r.letterTypes.includes("all")) && servesZip(r, zip))
    .sort((a, b) => Number(!a.zips?.length) - Number(!b.zips?.length) || Number(a.letterTypes.includes("all")) - Number(b.letterTypes.includes("all")));
}

export function resourceDescription(resource: Resource, language: Language): string {
  return resource.description[language] ?? resource.description.en;
}

// "tel:" link for a number as printed. Only the first number counts: an extension ("ext. 12") or a note
// like "(TTY 711)" is dropped, since a phone can't dial it from a link.
export function telHref(phone: string): string {
  const beforeExtension = phone.split(/\s*(?:ext\.?|extension|x)\s*\d/i)[0];
  const number = beforeExtension.match(/\+?\d[\d\s().-]*\d|\d/)?.[0] ?? beforeExtension;
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Phone numbers and emails printed in the letter itself. Numbers and addresses are shown left to right
// even on an Arabic page, so they read the same as on the letter.
function LetterContacts({ contacts, t }: { contacts: LetterContact[]; t: Strings }) {
  return (
    <ul className="flex flex-col gap-[24px]">
      {contacts.map((c, i) => (
        <li key={`${c.type}-${c.value}-${i}`} className="flex flex-col gap-[16px] rounded-[16px] border border-line bg-paper p-[24px]">
          {c.label && <p className="text-[1.1111rem] font-bold leading-[1.4]">{c.label}</p>}
          {c.type === "phone" ? (
            <a href={telHref(c.value)} className="btn btn-primary">
              <Icon name="phone" />
              <span className="flex-1">
                {t.call} <bdi dir="ltr">{c.value}</bdi>
              </span>
            </a>
          ) : looksLikeEmail(c.value) ? (
            <a href={`mailto:${c.value.trim()}`} className="btn btn-secondary">
              <Icon name="mail" />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {t.email} <bdi dir="ltr">{c.value.trim()}</bdi>
              </span>
            </a>
          ) : (
            <p dir="ltr" className="[overflow-wrap:anywhere]">
              {c.value}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Resources({
  letterType,
  zip,
  contacts,
  language,
  t,
  nested = false,
}: {
  letterType: LetterType;
  zip: string;
  contacts: LetterContact[];
  language: Language;
  t: Strings;
  nested?: boolean;
}) {
  const matches = matchResources(letterType, zip);
  const id = useId();
  const H = nested ? "h3" : "h2";
  const Sub = nested ? "h4" : "h3";

  if (matches.length === 0 && contacts.length === 0) return null;

  return (
    <section aria-labelledby={id} className="card">
      <H id={id} className="heading">
        {t.whoToCall}
      </H>
      {contacts.length > 0 && (
        <>
          <Sub className="text-[1.1111rem] font-bold">{t.fromYourLetter}</Sub>
          <LetterContacts contacts={contacts} t={t} />
        </>
      )}
      {matches.length > 0 && (
        <>
          {contacts.length > 0 && <Sub className="text-[1.1111rem] font-bold">{t.moreHelp}</Sub>}
          {zip && <p className="text-muted">{t.helpNear(zip)}</p>}
          <ul className="flex flex-col gap-[24px]">
            {matches.map((r) => (
              <li key={r.name} className="flex flex-col gap-[16px] rounded-[16px] border border-line bg-paper p-[24px]">
                <p className="text-[1.1111rem] font-bold leading-[1.4]">{r.name}</p>
                <p>{resourceDescription(r, language)}</p>
                <a href={telHref(r.phone)} className="btn btn-primary">
                  <Icon name="phone" />
                  <span className="flex-1">
                    {t.call} <bdi dir="ltr">{r.phone}</bdi>
                  </span>
                </a>
                {r.url && (
                  <>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      <Icon name="external" />
                      <span className="flex-1">{t.website}</span>
                    </a>
                    <p className="text-muted">{new URL(r.url).hostname.replace(/^www\./, "")}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
