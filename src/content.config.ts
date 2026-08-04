import process from "node:process";
import { defineCollection, z } from 'astro:content';
import { loadEnv } from "vite";
import {
  notionLoader,
  notionPageSchema,
  propertySchema,
  transformedPropertySchema,
} from "@/lib/notion-loader";
import { fileLoader } from "@/lib/file-loader";
import convertNotionBookmark from "./lib/rehype/convertNotionBookmark";

const env = loadEnv(import.meta.env.NODE_ENV, process.cwd(), "");

// 콘텐츠 정본은 src/data/news/ 파일이다(동결 JSON + 신규 md) — 기본 fileLoader.
// `CONTENT_SOURCE=notion` 은 재-export 전용 escape hatch: Notion(읽기전용 백업)에서
// 다시 로드해 scripts/freeze-content.mjs 로 동결을 갱신할 때만 쓴다.
const useNotion = (process.env.CONTENT_SOURCE ?? env.CONTENT_SOURCE) === "notion";

const news = defineCollection({
  loader: useNotion
    ? notionLoader({
        auth: process.env.NOTION_TOKEN ?? env.NOTION_TOKEN,
        database_id: process.env.NOTION_DATABASE_ID ?? env.NOTION_DATABASE_ID,
        filter: {
          select: {
            equals: "New",
          },
          property: "Status",
        },
        rehypePlugins: [
          convertNotionBookmark,
        ],
      })
    : fileLoader(),
  schema: notionPageSchema({
    properties: z.object({
      이름: transformedPropertySchema.title,
      Status: propertySchema.select,
      날짜: transformedPropertySchema.date,
    }).transform((data) => ({
      ...data,
      Name: data.이름,
    })),
  }),
});

export const collections = {
  news,
};
