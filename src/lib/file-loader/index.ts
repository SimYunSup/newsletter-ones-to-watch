import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as devalue from "devalue";
import { z } from "astro/zod";
import type { Loader } from "astro/loaders";
import { htmlToText, writeSearchIndex, type SearchDoc } from "../search/index-writer";
import { parseFrontmatter, renderMarkdown } from "./render-md";

/**
 * 파일 기반 뉴스 로더 — Notion 마이그레이션의 심장.
 *
 *  - `src/data/news/<uuid>.json`: notion-loader 가 마지막으로 렌더한 엔트리를
 *    scripts/freeze-content.mjs 로 동결한 것(devalue). **그대로 store.set** 하므로
 *    레거시 호는 기존 사이트와 바이트 동일하게 렌더된다(교차링크 앵커 = Notion 블록ID 포함).
 *  - `src/data/news/<slug>.md`: 신규 호. 프론트매터(title/date[/status]) + 본문을
 *    render-md 로 렌더해 같은 모양(data.properties.이름·날짜, rendered.html)으로 넣는다.
 *    URL 은 `/news/post/<slug>` — 파일명이 곧 슬러그다.
 *
 * munja 전문검색 인덱스는 notion-loader 와 동일하게 이 지점(전 코퍼스가 보이는 곳)에서
 * 빌드한다 — 빌드/질의 토크나이즈 경로가 같아야 하므로.
 */

/** 동결 파일 엔벨로프(자체 산출물이지만 디스크를 거치므로 한 번 검증). data 내부는
 *  export 시점에 컬렉션 스키마를 이미 통과했다 — 여기서 재검증하지 않는다. */
const frozenEntrySchema = z.object({
  id: z.string(),
  data: z.record(z.unknown()),
  digest: z.string(),
  rendered: z.object({ html: z.string(), metadata: z.record(z.unknown()).optional() }).passthrough(),
});

function entryTitle(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("properties" in data)) return undefined;
  const props = data.properties;
  if (!props || typeof props !== "object" || !("이름" in props)) return undefined;
  const title = props.이름;
  return typeof title === "string" ? title : undefined;
}

export function fileLoader({ dataDir = "src/data/news" }: { dataDir?: string } = {}): Loader {
  return {
    name: "file-loader",
    async load({ store, logger, parseData }) {
      logger.info(`Loading news entries from ${dataDir}`);
      const files = (await readdir(dataDir)).sort();
      const seen = new Set<string>();

      for (const file of files) {
        const path = join(dataDir, file);
        if (file.endsWith(".json")) {
          const entry = frozenEntrySchema.parse(devalue.parse(await readFile(path, "utf8")));
          seen.add(entry.id);
          // 동결 데이터는 export 시점에 이미 스키마 변환·검증을 통과했다 — 그대로 적재.
          if (store.get(entry.id)?.digest !== entry.digest) store.set(entry);
          continue;
        }
        if (!file.endsWith(".md")) continue;

        const id = file.slice(0, -3);
        seen.add(id);
        const source = await readFile(path, "utf8");
        const digest = createHash("sha256").update(source).digest("hex");
        if (store.get(id)?.digest === digest) continue;

        const { meta, body } = parseFrontmatter(source);
        if (!meta.title || !meta.date) {
          throw new Error(`${file}: 프론트매터에 title/date 가 필요합니다`);
        }
        const { html, headings } = await renderMarkdown(body);
        // notion-loader 의 raw page 모양을 합성해 컬렉션 스키마(zod 변환) 한 곳으로 통일.
        const data = await parseData({
          id,
          data: {
            icon: null,
            cover: null,
            archived: false,
            in_trash: false,
            url: `https://ones-to-watch.ethansup.net/news/post/${id}`,
            public_url: null,
            properties: {
              이름: {
                type: "title",
                id: "title",
                title: [
                  {
                    type: "text",
                    text: { content: meta.title, link: null },
                    plain_text: meta.title,
                    href: null,
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: "default",
                    },
                  },
                ],
              },
              Status: {
                type: "select",
                id: "status",
                select: { id: "status", name: meta.status ?? "New", color: "default" },
              },
              날짜: {
                type: "date",
                id: "date",
                date: { start: meta.date, end: null, time_zone: null },
              },
            },
          },
        });
        store.set({ id, data, digest, rendered: { html, metadata: { headings, imagePaths: [] } } });
      }

      for (const id of store.keys()) {
        if (!seen.has(id)) store.delete(id);
      }

      // munja 인덱스 — notion-loader 의 블록과 동일(검색이 콘텐츠 로드를 실패시키지 않는다).
      try {
        const docs: SearchDoc[] = [];
        for (const [id, entry] of store.entries()) {
          const rendered = entry.rendered;
          if (!rendered?.html) continue;
          docs.push({
            title: entryTitle(entry.data) ?? id,
            category: "news",
            href: `/news/post/${id}`,
            body: htmlToText(rendered.html),
            keywords: null,
          });
        }
        const size = writeSearchIndex(docs);
        logger.info(`munja: indexed ${docs.length} entries → public/index.bin (${size} bytes)`);
      } catch (error) {
        logger.warn(`munja: failed to build search index: ${String(error)}`);
      }
    },
  };
}
