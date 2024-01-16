import {Client, LogLevel} from "@notionhq/client";

export const notionClient = new Client({
  auth: import.meta.env.NOTION_TOKEN,
  logLevel: import.meta.env.MODE === 'development' ? LogLevel.DEBUG : LogLevel.ERROR,
})
