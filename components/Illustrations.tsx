// The two line illustrations from the Figma design, redrawn in currentColor so they follow light and dark mode.

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function EnvelopeIllustration() {
  return (
    <svg aria-hidden="true" width="180" height="140" viewBox="0 0 180 140" className="text-teal">
      <g {...STROKE}>
        <path d="M15 44 90 7l76 37v84H15Z" />
        <path d="m15 44 75 47 76-47" />
        <path d="M15 128 68 76m98 52-53-52" />
        <path d="M52 67V21h76v46" />
        <path d="M66 39h46M66 53h34" />
      </g>
    </svg>
  );
}

export function FlatLetterIllustration() {
  return (
    <svg aria-hidden="true" width="180" height="140" viewBox="0 0 180 140" className="text-teal">
      <g {...STROKE}>
        <rect x="48" y="14" width="86" height="116" />
        <path d="M66 48h50M66 65h50M66 83h40" />
        <path d="m20 4 9 10M4 30h19m-14 31 17-10M156 26l15-9m-20 33h28" />
      </g>
    </svg>
  );
}
