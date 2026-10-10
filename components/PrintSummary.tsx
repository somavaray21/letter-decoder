import { formatDate, type Strings } from "@/lib/i18n";
import type { DecodeResult, Language } from "@/lib/types";
import type { ChatEntry } from "./LetterChat";
import { matchResources, resourceDescription } from "./Resources";

// One-column summary shown only when printing ("Save as PDF"). Hidden on screen.
// With several documents, each one starts on a new page under a "Document 1 of 2" title.
export function PrintSummary({
  documents,
  language,
  t,
}: {
  documents: { result: DecodeResult; chat: ChatEntry[] }[];
  language: Language;
  t: Strings;
}) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <article className="print-summary hidden print:block">
      <header>
        <h1>{t.printTitle}</h1>
        <p>{t.printDate(formatDate(today, language))}</p>
      </header>
      {documents.map(({ result, chat }, i) => (
        <div key={i} className={i > 0 ? "doc-break" : undefined}>
          {documents.length > 1 && <h2 className="doc-title">{t.documentOf(i + 1, documents.length)}</h2>}
          <DocumentSummary result={result} chat={chat} language={language} t={t} />
        </div>
      ))}
      <footer>{t.printFooter}</footer>
    </article>
  );
}

function DocumentSummary({
  result,
  chat,
  language,
  t,
}: {
  result: DecodeResult;
  chat: ChatEntry[];
  language: Language;
  t: Strings;
}) {
  const helpers = matchResources(result.letterType, result.zip);

  return (
    <>

      <section>
        {result.sender && (
          <p>
            <strong>{t.from}:</strong> {result.sender}
          </p>
        )}
        <p>
          <strong>{t.urgencyLabel}:</strong> {t.urgency[result.urgency]}
        </p>
        <p>{t.letterTypes[result.letterType]}</p>
        {result.confidence === "low" && <p>{t.lowConfidence}</p>}
      </section>

      <section>
        <h2>{t.whatItIs}</h2>
        <p>{result.summary}</p>
      </section>

      <section>
        <h2>{t.deadlines}</h2>
        {result.deadlines.length === 0 ? (
          <p>{t.noDeadlines}</p>
        ) : (
          <ul>
            {result.deadlines.map((d, i) => (
              <li key={`${d.date}-${i}`}>
                <p>
                  <strong>{formatDate(d.date, language)}:</strong> {d.what}
                </p>
                {d.sourceQuote && (
                  <p className="quote">
                    {t.letterSays}: ‘{d.sourceQuote}’
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{t.steps}</h2>
        <ol>
          {result.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {(helpers.length > 0 || result.contacts.length > 0) && (
        <section>
          <h2>{t.whoToCall}</h2>
          <ul>
            {result.contacts.map((c, i) => (
              <li key={`${c.type}-${c.value}-${i}`}>
                <p>
                  {c.label && <strong>{c.label} · </strong>}
                  <bdi dir="ltr">{c.value}</bdi>
                </p>
              </li>
            ))}
            {helpers.map((r) => (
              <li key={r.name}>
                <p>
                  <strong>{r.name}</strong> · {r.phone}
                  {r.url && <> · {new URL(r.url).hostname.replace(/^www\./, "")}</>}
                </p>
                <p>{resourceDescription(r, language)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chat.length > 0 && (
        <section>
          <h2>{t.printQuestions}</h2>
          <ul>
            {chat.map((entry, i) => (
              <li key={i}>
                <p>
                  <strong>{t.question}:</strong> {entry.question}
                </p>
                <p>
                  <strong>{t.answer}:</strong> {entry.answer}
                </p>
                {entry.sourceQuote && (
                  <p className="quote">
                    {t.letterSays}: ‘{entry.sourceQuote}’
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

    </>
  );
}
