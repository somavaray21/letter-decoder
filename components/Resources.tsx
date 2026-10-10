import resources from "@/data/resources.json";
import type { Strings } from "@/lib/i18n";
import type { Language, LetterType, Resource } from "@/lib/types";

// A resource serves a ZIP when it lists no ZIPs (works anywhere) or one of its entries is a prefix of the ZIP.
function servesZip(resource: Resource, zip: string): boolean {
  if (!resource.zips || resource.zips.length === 0) return true;
  if (!zip) return false;
  return resource.zips.some((prefix) => zip.startsWith(prefix));
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
  const matches = (resources as Resource[])
    .filter((r) => (r.letterTypes.includes(letterType) || r.letterTypes.includes("all")) && servesZip(r, zip))
    // Local, letter-specific help first; general help (like 211) last.
    .sort((a, b) => Number(!a.zips?.length) - Number(!b.zips?.length) || Number(a.letterTypes.includes("all")) - Number(b.letterTypes.includes("all")));

  if (matches.length === 0) return null;

  return (
    <section aria-labelledby="who-to-call" className="card">
      <h2 id="who-to-call" className="section-title">
        {t.whoToCall}
      </h2>
      {zip && <p className="-mt-2 mb-4 text-muted">{t.helpNear(zip)}</p>}
      <ul className="space-y-4">
        {matches.map((r) => (
          <li key={r.name} className="rounded-[14px] border border-line p-4">
            <p className="text-xl font-bold">{r.name}</p>
            <p className="mt-1 text-muted">{r.description[language]}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="btn btn-primary">
                <span aria-hidden="true">📞</span> {t.call} {r.phone}
              </a>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  {t.website}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
