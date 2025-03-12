import process from "node:process";
import { defineCollection, z } from 'astro:content';
import { loadEnv } from "vite";
import { notionLoader, notionPageSchema } from "notion-astro-loader";
import {
  propertySchema,
  transformedPropertySchema
} from "notion-astro-loader/schemas";
import convertNotionBookmark from "./lib/rehype/convertNotionBookmark";

const env = loadEnv(import.meta.env.NODE_ENV, process.cwd(), "");
console.log(JSON.stringify(process.env));
const news = defineCollection({
  loader: notionLoader({
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
  }),
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
