import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import "./globals.css";

const heading = Fraunces({ subsets: ["latin"], axes: ["SOFT", "WONK"], variable: "--font-heading", display: "swap" });
const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Letter Decoder",
  description: "Take a photo of a confusing official letter and get a plain-language explanation, deadlines and next steps.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF7F2",
};

// Applies the saved text size and appearance before first paint, so a dark-mode reader never sees a white flash.
// Keys match components/ReadingPreferences.tsx. With nothing saved, appearance follows the phone's setting.
const applySavedPreferences = `try{var d=document.documentElement,s=localStorage.getItem("letter-decoder:text-size"),t=localStorage.getItem("letter-decoder:theme");d.dataset.textSize=s==="large"?"large":"normal";d.dataset.theme=t==="dark"||t==="light"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applySavedPreferences }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
