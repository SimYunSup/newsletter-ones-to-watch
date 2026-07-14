import process from "node:process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as cheerio from "cheerio";
// `@pickhealer/munja` is the wasm-pack (`--target web`) build. In Node we drive
// it with `initSync` + the vendored `.wasm`, so build-time tokenization is the
// exact same code path the browser runs at query time.
// @ts-expect-error — wasm-bindgen glue ships no bundled .d.ts subpath here.
import { initSync, build_index_bytes } from "@pickhealer/munja";

const require = createRequire(import.meta.url);

let ready = false;
function ensureWasm() {
  if (ready) return;
  const wasmPath = require.resolve("@pickhealer/munja/munja_bg.wasm");
  initSync({ module: readFileSync(wasmPath) });
  ready = true;
}

export interface SearchDoc {
  title: string;
  category: string;
  href: string;
  body: string;
  keywords?: string[] | null;
}

/** Strip rendered HTML down to the plain text munja should tokenize. */
export function htmlToText(html: string): string {
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}

/**
 * Build the munja index from `docs` and write it to `public/<fileName>` under
 * the project root. Returns the byte length of the written index.
 */
export function writeSearchIndex(docs: SearchDoc[], fileName = "index.bin"): number {
  ensureWasm();
  const bytes: Uint8Array = build_index_bytes(JSON.stringify(docs));
  const outFile = join(process.cwd(), "public", fileName);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, bytes);
  return bytes.length;
}
