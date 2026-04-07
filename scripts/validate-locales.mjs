/**
 * Ensures every locale matches `en` keys and placeholder metadata.
 * Run: node scripts/validate-locales.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "_locales");
const enPath = path.join(root, "en", "messages.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enKeys = Object.keys(en);

function placeholderKeys(entry) {
  return entry?.placeholders ? Object.keys(entry.placeholders).sort().join(",") : "";
}

let failed = false;

for (const loc of fs.readdirSync(root)) {
  if (loc === "en") continue;
  const p = path.join(root, loc, "messages.json");
  if (!fs.existsSync(p)) {
    console.error(`Missing ${loc}/messages.json`);
    failed = true;
    continue;
  }
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const k of enKeys) {
    if (!(k in j)) {
      console.error(`${loc}: missing key "${k}"`);
      failed = true;
      continue;
    }
    const a = en[k];
    const b = j[k];
    if (placeholderKeys(a) !== placeholderKeys(b)) {
      console.error(`${loc}: "${k}" placeholders differ from en`);
      failed = true;
    }
    if (a.placeholders) {
      for (const n of Object.keys(a.placeholders)) {
        const token = `$${n}$`;
        if (!b.message.includes(token)) {
          console.error(`${loc}: "${k}" message missing ${token}: ${JSON.stringify(b.message)}`);
          failed = true;
        }
      }
    }
  }
  for (const k of Object.keys(j)) {
    if (!enKeys.includes(k)) {
      console.error(`${loc}: extra key "${k}"`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`OK: ${enKeys.length} keys × ${fs.readdirSync(root).length - 1} locales`);
