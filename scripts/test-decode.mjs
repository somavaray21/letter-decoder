// Sends an image file to the running app's /api/decode and prints the JSON.
// Usage: npm run test:decode -- path/to/letter.png [en|es] [http://localhost:3000]
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const [file, language = "en", base = "http://localhost:3000"] = process.argv.slice(2);
if (!file) {
  console.error("Usage: npm run test:decode -- path/to/letter.png [en|es] [baseUrl]");
  process.exit(1);
}

const mimeTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const mimeType = mimeTypes[extname(file).toLowerCase()] ?? "image/jpeg";
const image = (await readFile(file)).toString("base64");

const started = Date.now();
const res = await fetch(`${base}/api/decode`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image, mimeType, language }),
});
console.log(`HTTP ${res.status} in ${Date.now() - started} ms`);
console.log(JSON.stringify(await res.json(), null, 2));
