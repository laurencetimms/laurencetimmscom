// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://laurencetimms.com',
  integrations: [sitemap()],

  // Everything is static by default. If a future route needs to run
  // server-side (e.g. an /api/* endpoint wrapping the Pandolf calculator),
  // add `export const prerender = false;` to that page only — the
  // Cloudflare adapter serves static pages as free, unlimited static
  // assets and only invokes a Worker for the routes that opt out.
  output: 'static',

  // No server-side sessions on a static site — avoids the adapter
  // requiring a KV namespace binding for a feature we don't use.
  session: false,

  adapter: cloudflare({
    imageService: 'passthrough',
  }),
});
