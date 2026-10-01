# laurencetimms.com

Static site, built with Astro, deployed to Cloudflare Workers (static assets).

See [DECISIONS.md](./DECISIONS.md) for why the site is structured, hosted and
designed the way it is — read that before making structural changes.

## Structure

- `/` — homepage
- `/writing/` — frameworks & essays
- `/coaching/` — coaching practice
- `/claus/` — CLAUS project page
- `/loadedzone/` — LoadedZone sub-brand
- `/projects/` — projects hub (linked from nav)
- `/walk/` — Walk sub-brand
- `/lab/` — smaller game/software projects
  - `/lab/pavement/` — Pavement, a standalone HTML game (`public/lab/pavement/index.html`);
    `workshop.html` is the same game built with the tile harness's texture pack
  - `/lab/tile-harness/` — the Python tile harness running in the browser via Pyodide
    (see below)
- `/ai/` — how AI is used in building and writing this site, linked from the footer
- `public/llms.txt` — machine-readable site summary
- `public/robots.txt`

Design tokens (colour, type) live in `src/styles/global.css`. Shared
layout, nav, and the site-wide `Person` schema.org JSON-LD live in
`src/layouts/Layout.astro`.

`/writing/` is an Astro content collection (`src/content.config.ts`),
sourced from markdown files in `src/content/writing/`.

### LoadedZone (`/loadedzone/`)

Not a page — a second, self-contained Astro+React+Tailwind app merged
into this repo, kept visually distinct as its own sub-brand rather than
restyled to match. It doesn't use the site-wide `<Layout>`; it has its
own shell (`src/layouts/LoadedZoneLayout.astro`), own stylesheet
(`src/styles/loadedzone.css`, Tailwind v4 + a `@theme` palette), own
React island components (`src/components/loadedzone/`), and its
calculation logic in `src/lib/loadedzone/calculators.ts` (pure functions,
no dependencies — the Pandolf equation and heart-rate-zone maths). Runs
entirely client-side; no server calls. See DECISIONS.md for why it's kept
architecturally separate rather than folded into the main design system.

Currently ported: the three calculators (Find Your Zone 2, Load Up,
Session Card) and the About page. The source repo's Learn/Guides article
content isn't ported yet — a deliberate scope cut, not an oversight.

## Tile harness (`/lab/tile-harness/`)

Plain static files in `public/lab/tile-harness/`, outside Astro:

- `py/` — the harness's Python source, unmodified (`run.py`, `harness/`, `game/`,
  `sources/`). Edit it here.
- `worker.js` — loads Pyodide 0.29.5 (numpy, OpenCV, Pillow) from jsDelivr, copies
  `py/` into an in-memory folder and runs `run.py` / `game/build.py` there. **If you
  add a file to `py/`, add it to the `FILES` list at the top of `worker.js`.** The
  game it builds from is `public/lab/pavement/index.html` (fetched in as
  `game/pavement_base.html`), so there's one copy of the game. `harness/gemini.py`
  is swapped for a stand-in that calls the Gemini REST API with a key typed into the
  page, since the `google-genai` SDK doesn't run in Pyodide.
- `index.html` — the page: buttons for each step, a `python run.py …` command box,
  the harness's own gallery (its "Save picks" writes `picks.json` into the workspace),
  a file browser, and zip download/upload of the whole workspace.

`public/lab/pavement/workshop.html` is a prebuilt copy of the harness output; to
refresh it, run "Pack and build the game" on the harness page, then download
`out/pavement-workshop.html` from the Files tab and replace it.

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
