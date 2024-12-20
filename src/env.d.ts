/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly IMAGE_BASE: string;
}

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type R2Object = import('@cloudflare/workers-types').R2Object;
interface ENV {
  SERVER_URL: string;
  CRAWLER_KV: KVNamespace;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
  }
}
