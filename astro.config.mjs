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
    mode: 'directory',
    imageService: "cloudflare",
    platformProxy: {
      enabled: true
    },
    runtime: {
      mode: 'local',
      type: 'workers',
    },
  }),
});