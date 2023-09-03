/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
    readonly CONTENT_API_KEY: string;
    readonly GHOST_SITE_URL: string;
    readonly ADMIN_API_KEY: string;
}