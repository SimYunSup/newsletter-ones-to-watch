/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
    readonly NOTION_TOKEN: string;
    readonly NOTION_DATABASE_ID: string;
}
