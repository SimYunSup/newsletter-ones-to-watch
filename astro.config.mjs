import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import cloudflare from "@astrojs/cloudflare";
import { loadEnv } from "vite";

import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  site: 'https://ones-to-watch.ethansup.net',
  integrations: [sitemap(), mdx(), partytown()],
  trailingSlash: 'ignore',
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    ssr: {
      external: ['node:process'],
    },
  },
  output: 'server',
  image: {
    ...process.env.NODE_ENV === 'production' ? {} : {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**.amazonaws.com",
        },
      ],
    }
  },
  adapter: cloudflare({
    // @astrojs/cloudflare v14 dropped `mode`, `platformProxy`, and `runtime`
    // (bindings now come from the wrangler config via @cloudflare/vite-plugin).
    // `imageService: 'passthrough'` avoids claiming the R2 `IMAGES` binding as a
    // Cloudflare Images binding; the loader already falls back to remote URLs.
    imageService: 'passthrough',
  }),
});