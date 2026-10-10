"use client";

import { useRef, useState } from "react";
import type { Strings } from "@/lib/i18n";
import { Icon } from "./Icon";

// The photos of the letter, shown from blob: URLs in page state only. Nothing is uploaded or saved for this.
// "edit" lists each page with a Remove button before decoding; "view" is a grid on the results page.
// Tapping a page opens it large in a dialog, with Previous and Next for letters with several pages.
export function LetterPages({
  urls,
  t,
  onRemove,
}: {
  urls: string[];
  t: Strings;
  onRemove?: (index: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);
  const total = urls.length;

  function open(index: number) {
    setCurrent(index);
    dialog.current?.showModal();
  }

  const thumbnail = (url: string, i: number, className: string) => (
    <button
      type="button"
      onClick={() => open(i)}
      aria-label={t.openPage(i + 1)}
      className={`flex cursor-pointer items-center justify-center rounded-[14px] bg-line p-[8px] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
      <img src={url} alt="" className="h-full w-full rounded-[4px] bg-card object-contain" />
    </button>
  );

  return (
    <>
      {onRemove ? (
        <ol className="flex flex-col gap-[16px]">
          {urls.map((url, i) => (
            <li key={url} className="flex items-center gap-[16px] rounded-[16px] border border-line bg-card p-[12px]">
              {thumbnail(url, i, "h-[120px] w-[96px] shrink-0")}
              <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
                <p className="font-bold">{t.pageLabel(i + 1, total)}</p>
                <button type="button" onClick={() => onRemove(i)} className="btn btn-secondary">
                  {t.removePage(i + 1)}
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ol className={`grid gap-[12px] ${total === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {urls.map((url, i) => (
            <li key={url} className="flex flex-col gap-[8px]">
              {thumbnail(url, i, total === 1 ? "h-[320px] w-full" : "h-[200px] w-full")}
              <p className="text-center text-muted">{t.pageLabel(i + 1, total)}</p>
            </li>
          ))}
        </ol>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="page-viewer-title"
        className="m-auto max-h-[calc(100dvh-24px)] w-[min(calc(100vw-24px),900px)] max-w-none rounded-[16px] border border-line bg-card p-[16px] text-ink backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-[16px]">
          <div className="flex items-center gap-[12px]">
            <h2 id="page-viewer-title" className="flex-1 font-serif text-[1.3333rem] font-semibold">
              {total > 0 ? t.pageLabel(current + 1, total) : ""}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className="btn btn-secondary w-auto">
              {t.close}
            </button>
          </div>
          {urls[current] && (
            /* eslint-disable-next-line @next/next/no-img-element -- local blob preview */
            <img
              src={urls[current]}
              alt={t.pageAlt(current + 1)}
              className="max-h-[calc(100dvh-220px)] w-full rounded-[4px] bg-line object-contain"
            />
          )}
          {total > 1 && (
            <div className="flex gap-[12px]">
              <button
                type="button"
                onClick={() => setCurrent((i) => i - 1)}
                disabled={current === 0}
                className="btn btn-secondary"
              >
                <Icon name="chevronDown" className="rotate-90 rtl:-rotate-90" />
                <span className="flex-1">{t.previousPage}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrent((i) => i + 1)}
                disabled={current === total - 1}
                className="btn btn-secondary"
              >
                <span className="flex-1">{t.nextPage}</span>
                <Icon name="chevronDown" className="-rotate-90 rtl:rotate-90" />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
