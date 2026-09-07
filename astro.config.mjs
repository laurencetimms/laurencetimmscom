// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://laurencetimms.com',
  // react() only hydrates components that actually import it (the
  // /loadedzone/ calculators) — it has no effect on pages that don't use
  // React. Same for the Tailwind Vite plugin: it only processes stylesheets
  // that `@import "tailwindcss"` (src/styles/loadedzone.css), so the rest
  // of the site's hand-written CSS is untouched. See DECISIONS.md.
  integrations: [sitemap(), react()],

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

  vite: {
    plugins: [tailwindcss()],
  },
});
