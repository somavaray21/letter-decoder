"use client";

import { useId, useRef, useState } from "react";
import type { Strings } from "@/lib/i18n";
import type { DocumentKind } from "@/lib/resizeImage";
import { Icon } from "./Icon";

export type LetterFile = { url: string; kind: DocumentKind; name: string };

// The uploaded documents, shown from blob: URLs in page state only. Nothing is uploaded or saved for this.
// With onRemove it lists each document with a Remove button before decoding; without it, it shows one
// document on its results. Tapping a document opens it large in a dialog (a PDF opens in the browser's viewer).
export function LetterPages({
  files,
  t,
  onRemove,
  numberFrom = 1,
}: {
  files: LetterFile[];
  t: Strings;
  onRemove?: (index: number) => void;
  numberFrom?: number; // document number of files[0], for labels
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [current, setCurrent] = useState(0);
  const open = files[current];

  function show(index: number) {
    setCurrent(index);
    dialog.current?.showModal();
  }

  const thumbnail = (file: LetterFile, i: number, className: string) => (
    <button
      type="button"
      onClick={() => show(i)}
      aria-label={t.openDocument(numberFrom + i)}
      className={`flex cursor-pointer items-center justify-center rounded-[14px] bg-line p-[8px] ${className}`}
    >
      {file.kind === "pdf" ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-[8px] rounded-[4px] bg-card p-[8px] text-teal">
          <Icon name="file" size={40} />
          <span className="font-bold">PDF</span>
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- local blob preview */
        <img src={file.url} alt="" className="h-full w-full rounded-[4px] bg-card object-contain" />
      )}
    </button>
  );

  return (
    <>
      {onRemove ? (
        <ol className="flex flex-col gap-[16px]">
          {files.map((file, i) => (
            <li key={file.url} className="flex items-center gap-[16px] rounded-[16px] border border-line bg-card p-[12px]">
              {thumbnail(file, i, "h-[120px] w-[96px] shrink-0")}
              <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
                <p className="font-bold">{t.documentLabel(numberFrom + i)}</p>
                <p dir="auto" className="truncate text-muted">
                  {file.name}
                </p>
                <button type="button" onClick={() => onRemove(i)} className="btn btn-secondary">
                  {t.removeDocument(numberFrom + i)}
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {files.map((file, i) => (
            <div key={file.url}>{thumbnail(file, i, file.kind === "pdf" ? "h-[160px] w-full" : "h-[320px] w-full")}</div>
          ))}
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto max-h-[calc(100dvh-24px)] w-[min(calc(100vw-24px),900px)] max-w-none rounded-[16px] border border-line bg-card p-[16px] text-ink backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-[16px]">
          <div className="flex items-center gap-[12px]">
            <h2 id={titleId} className="flex-1 font-serif text-[1.3333rem] font-semibold">
              {t.documentLabel(numberFrom + current)}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className="btn btn-secondary w-auto">
              {t.close}
            </button>
          </div>
          {open?.kind === "pdf" ? (
            <>
              {/* Phones often can't show a PDF inside the page, so there is always a link to open it on its own. */}
              <object data={open.url} type="application/pdf" aria-label={open.name} className="h-[calc(100dvh-260px)] w-full rounded-[4px] bg-line">
                <p className="p-[16px]">{t.pdfLabel}</p>
              </object>
              <a href={open.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Icon name="external" />
                <span className="flex-1">{t.openPdf}</span>
              </a>
            </>
          ) : (
            open && (
              /* eslint-disable-next-line @next/next/no-img-element -- local blob preview */
              <img
                src={open.url}
                alt={t.documentAlt(numberFrom + current)}
                className="max-h-[calc(100dvh-160px)] w-full rounded-[4px] bg-line object-contain"
              />
            )
          )}
        </div>
      </dialog>
    </>
  );
}
