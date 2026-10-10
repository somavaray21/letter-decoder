import resources from "@/data/resources.json";
import type { Strings } from "@/lib/i18n";
import type { Language, LetterType, Resource } from "@/lib/types";

export function Resources({ letterType, language, t }: { letterType: LetterType; language: Language; t: Strings }) {
  const matches = (resources as Resource[])
    .filter((r) => r.letterTypes.includes(letterType) || r.letterTypes.includes("all"))
    // Specific matches first, general ones (like 211) last.
    .sort((a, b) => Number(a.letterTypes.includes("all")) - Number(b.letterTypes.includes("all")));

  if (matches.length === 0) return null;

  return (
    <section aria-labelledby="who-to-call" className="card">
      <h2 id="who-to-call" className="section-title">
        {t.whoToCall}
      </h2>
      <ul className="space-y-4">
        {matches.map((r) => (
          <li key={r.name} className="rounded-xl border-2 border-neutral-300 p-4">
            <p className="text-xl font-bold">{r.name}</p>
            <p className="mt-1">{r.description[language]}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="btn bg-green-800 text-white hover:bg-green-900">
                <span aria-hidden="true">📞</span> {t.call} {r.phone}
              </a>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn border-2 border-neutral-900 bg-white text-neutral-900">
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
