import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from "@astrojs/tailwind";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://ones-to-watch.ethansup.net',
  integrations: [sitemap(), tailwind()],
  trailingSlash: 'never',
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    build: {
      minify: false,
    },
  },
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    runtime: {
      mode: 'local',
      type: 'pages',
      bindings: {
        'CRAWLER_KV': {
          type: 'kv',
        },
        'IMAGE_R2': {
          type: 'r2',
        },
      },
    },
  }),
});
