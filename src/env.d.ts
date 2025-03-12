/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly NOTION_TOKEN: string;
  readonly NOTION_DATABASE_ID: string;
  readonly IMAGE_BASE: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
  }
}
