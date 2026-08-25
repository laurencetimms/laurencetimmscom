# laurencetimms.com

Static site, built with Astro, deployed to Cloudflare Workers (static assets).

See [DECISIONS.md](./DECISIONS.md) for why the site is structured, hosted and
designed the way it is — read that before making structural changes.

## Structure

- `/` — homepage
- `/writing/` — frameworks & essays
- `/coaching/` — coaching practice
- `/skills/` — published Claude Skills index
- `/claus/` — CLAUS project page
- `/loadedzone/` — LoadedZone sub-brand
- `/projects/` — projects hub (linked from nav)
- `/walk/` — Walk sub-brand
- `/lab/` — smaller game/software projects
- `public/llms.txt` — machine-readable site summary
- `public/robots.txt`

Design tokens (colour, type) live in `src/styles/global.css`. Shared
layout, nav, and the site-wide `Person` schema.org JSON-LD live in
`src/layouts/Layout.astro`.

`/writing/` is an Astro content collection (`src/content.config.ts`),
sourced from markdown files in `src/content/writing/`.

## Adding a writing piece

Drop a markdown file in `src/content/writing/` with frontmatter matching
the schema in `src/content.config.ts` (`title`, `description`, `maturity`,
`published`, optionally `updated`, `draws_on`, `draft`). The filename
becomes the slug — the route and sitemap entry are automatic, no other
file needs touching.

`maturity` is shown to readers rather than hidden: `alpha` (first cut,
will change), `beta` (substantially settled), `current` (says what I want
it to say). When revising a published piece, bump `updated` and move
`maturity` along — that's what lets a crawler see the piece improving
rather than sitting static (see the per-article `dateModified` in
`src/pages/writing/[...slug].astro`).

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs to `dist/client` (this is what `wrangler.jsonc` points at).

## Deploy

One-time setup:

```bash
npm install -g wrangler   # or use npx wrangler for everything below
npx wrangler login
```

Deploy:

```bash
npm run build
npx wrangler deploy
```

The first deploy will publish to a `*.workers.dev` URL. To serve it at
laurencetimms.com:

1. Cloudflare dashboard → Workers & Pages → laurencetimms-site → Settings → Domains & Routes
2. Add Custom Domain → laurencetimms.com (and www.laurencetimms.com if wanted)
3. Since the domain is already on Cloudflare, DNS is created automatically — no external registrar step needed.

## Adding a new page

Add a folder under `src/pages/` with an `index.astro` that wraps its
content in `<Layout>`. It becomes a static route automatically — no
routing config needed.

## Adding a server-side endpoint later

Everything is static by default (free, unlimited requests). If a route
needs to run code server-side (e.g. wrapping the Pandolf calculator as
a callable API), add `export const prerender = false;` to that page/route
only — it will run as a Worker invocation while everything else stays
static.
