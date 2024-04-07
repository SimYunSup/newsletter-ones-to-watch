/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly IMAGE_BASE: string;
}

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type R2Object = import('@cloudflare/workers-types').R2Object;
type ENV = {
  SERVER_URL: string;
  KV_BINDING: KVNamespace;
};

type Runtime = import('@astrojs/cloudflare').DirectoryRuntime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
  }
}
