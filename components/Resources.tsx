import resources from "@/data/resources.json";
import type { Strings } from "@/lib/i18n";
import type { Language, LetterType, Resource } from "@/lib/types";
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

export function Resources({
  letterType,
  zip,
  language,
  t,
}: {
  letterType: LetterType;
  zip: string;
  language: Language;
  t: Strings;
}) {
  const matches = matchResources(letterType, zip);

  if (matches.length === 0) return null;

  return (
    <section aria-labelledby="who-to-call" className="card">
      <h2 id="who-to-call" className="heading">
        {t.whoToCall}
      </h2>
      {zip && <p className="text-muted">{t.helpNear(zip)}</p>}
      <ul className="flex flex-col gap-[24px]">
        {matches.map((r) => (
          <li key={r.name} className="flex flex-col gap-[16px] rounded-[16px] border border-line bg-paper p-[24px]">
            <p className="text-[1.1111rem] font-bold leading-[1.4]">{r.name}</p>
            <p>{r.description[language]}</p>
            <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="btn btn-primary">
              <Icon name="phone" />
              <span className="flex-1">
                {t.call} {r.phone}
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
    </section>
  );
}
