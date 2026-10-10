// Sends one letter (one or more page images) to the running app's /api/decode and prints the JSON.
// Usage: npm run test:decode -- page1.png [page2.png ...] [en|es|zh|fr|hi|ar|tl|ru] [http://localhost:3000]
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const LANGUAGES = ["en", "es", "zh", "fr", "hi", "ar", "tl", "ru"];
const args = process.argv.slice(2);
const language = args.find((a) => LANGUAGES.includes(a)) ?? "en";
const base = args.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000";
const files = args.filter((a) => a !== language && a !== base);
if (files.length === 0) {
  console.error("Usage: npm run test:decode -- page1.png [page2.png ...] [en|es|zh|fr|hi|ar|tl|ru] [baseUrl]");
  process.exit(1);
}

const mimeTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const images = await Promise.all(
  files.map(async (file) => ({
    data: (await readFile(file)).toString("base64"),
    mimeType: mimeTypes[extname(file).toLowerCase()] ?? "image/jpeg",
  })),
);

const started = Date.now();
const res = await fetch(`${base}/api/decode`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ images, language }),
});
console.log(`HTTP ${res.status} in ${Date.now() - started} ms`);
console.log(JSON.stringify(await res.json(), null, 2));
