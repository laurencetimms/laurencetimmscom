# laurencetimms.com redesign: build brief

For Claude Code, working in `laurencetimms/laurencetimmscom`. Written 25 Nov 2026.

Read `DECISIONS.md` and `README.md` first. This brief changes the site's
look and its top-level routes; it does **not** change the hosting model,
the static-by-default principle, the AI-visibility goal, or any of the
URLs listed under "Must not move".

Work on a branch (`redesign`). Stop at the end of each phase, summarise
what changed, and wait for Laurence to review before starting the next.

Reference designs are in `docs/redesign/reference/`:

- `HorizonPage.dc.html`: the coaching page (becomes `/`)
- `Mode7Live.dc.html`: the workshop page (becomes `/p100/`)

They're written in a design-tool component format (`<x-dc>`, `{{holes}}`,
`<sc-for>`, a `DCLogic` class), **not** Astro. Treat them as the visual and
behavioural spec: copy colours, type, spacing, layout and the JS logic
(sky bands, glitch, minesweeper), and rebuild them as Astro pages and small
vanilla-JS scripts. Don't try to run them.

---

## 1. The idea

The site has two rooms with deliberately different looks. There is no shared motif
beyond a consistent way to get between them.

| Room | Route | Look | Audience |
|---|---|---|---|
| Coaching | `/` (plus writing, CLAUS, about pages) | **Horizon** | Potential coaching clients |
| Workshop | `/p100/` and `/p100/<slug>/` | **Mode 7** (Ceefax / BBC Micro teletext) | People who like the games; people who might team up on AI projects |

LoadedZone (`/loadedzone/`) keeps its own identity, as now.

**Standing rule:** nothing that looks like the generic AI-startup or
generic-coach template: no gradient washes, glass cards, sparkle icons,
pill buttons, three-icon feature rows, "unlock / empower / supercharge"
copy. Both rooms must have a real point of difference.

### Horizon (coaching)

Structure carries a Stoic idea without ever stating it:

- **Sky** (top): what's *not* in your control. Huge, light, changing.
  Its colour follows the visitor's local time of day. The headline and
  lede sit here in light type, along with drifting "weather" phrases: the
  things clients worry about but don't control.
- **Horizon** (one 3px line + a yellow band): the coaching. The single
  call to action lives in the band.
- **Ground** (below): what *is* in your control. Dark, solid, heavier
  type. Everything actionable: what we work on, how it works, about,
  writing, contact.

**Never spell this out in copy.** No Epictetus quotes, no "dichotomy of
control" section. The layout does the work.

### Mode 7 (workshop)

A teletext page: exactly eight colours, one blocky font, page numbers for
everything, Fastext-style coloured links at the bottom, a live clock.
Two easter eggs: glitching characters and a minesweeper in the corner.

---

## 2. Tokens

### Horizon

Font: **Libre Franklin** (Google Fonts), weights 200, 300, 400, 700, 800. Nothing else.

| Token | Hex | Use |
|---|---|---|
| `--ink` / peat | `#2B2924` | Text on light skies, the ground, the horizon line |
| `--chalk` | `#EFEAE0` | Text on the ground; reading surface for articles |
| `--band` / rapeseed | `#D4A72C` | The band; section labels on the ground |
| `--muted-on-ground` | `#C9C3B6` | Secondary text on the ground |
| `--rule-on-ground` | `#6B665C` | Hairline dividers (decorative only) |

Sky bands (local hour → colours; `fg` is headline/body text, `soft` is the
drifting phrases):

| Band | Hours | bg | fg | soft |
|---|---|---|---|---|
| night | 0–4 | `#1C2430` | `#EFEAE0` | `#AAB4BF` |
| dawn | 5–7 | `#E6C7AE` | `#2B2924` | `#5E4C40` |
| morning | 8–10 | `#D4DFE5` | `#2B2924` | `#55626A` |
| midday | 11–14 | `#D9E0E2` | `#2B2924` | `#5B6266` |
| afternoon | 15–16 | `#E0DFCF` | `#2B2924` | `#5F5C4C` |
| dusk | 17–19 | `#C99B84` | `#2B2924` | `#47372F` |
| evening | 20–23 | `#3B4658` | `#EFEAE0` | `#C3CBD6` |

Ship midday as the server-rendered default (so crawlers and no-JS visitors
get a sensible page), then switch band client-side on load and every minute,
with a slow (~4s) background transition. Respect `prefers-reduced-motion`
(no transition, no drift).

### Mode 7

Font: **VT323** (Google Fonts) for now. Optional later: a genuine teletext
face such as Bedstead, but check its licence first.

Colours: exactly `#000000 #FF0000 #00FF00 #FFFF00 #0000FF #FF00FF #00FFFF #FFFFFF`.
Blue is a **background only** (blue text on black fails contrast).

Status labels and colours (text label always shown; colour is never the only signal):

| Status | Colour |
|---|---|
| PLAYABLE | green |
| IN PROGRESS | yellow |
| SKETCH | cyan |
| PARKED | magenta |

---

## 3. Routes

### New / changed

| Route | What |
|---|---|
| `/` | Horizon coaching page. Absorbs `/coaching/`, including the existing contact form. |
| `/p100/` | Mode 7 workshop index |
| `/p100/<slug>/` | One page per project (Mode 7) |
| `/writing/`, `/writing/<slug>/` | Restyled to Horizon (see §4.3) |
| `/claus/`, `/ai/`, `/walk/`, `404` | Restyled to Horizon. (Question for Laurence: should `/claus/` move into the workshop look? It's listed in P100 either way.) |

### Redirects (301)

| From | To |
|---|---|
| `/coaching/` | `/#begin` |
| `/lab/` | `/p100/` |
| `/projects/` | `/p100/` |

Use a `public/_redirects` file if Workers static assets supports it (check
current Cloudflare docs; it's expected to). Astro's `redirects` config
emits meta-refresh pages on a static build, which are not real 301s, so
only fall back to it if `_redirects` isn't available, and say so.

Update `ContactPoint.url` in the JSON-LD to `https://laurencetimms.com/#begin`.

### Must not move

These URLs are referenced from app stores or are play links people already have:

- `/walk/privacy/` (Play Console; see DECISIONS.md)
- `/underglaze/privacy`, `/underglaze/terms` (raw HTML in `public/underglaze/`)
- `/patchbay/privacy/`, `/beyondtheheadlines/privacy/`
- `/loadedzone/…` (all of it, own layout, untouched)
- Every game file under `/lab/<game>/…` (`one-up`, `teaspoon-deficit`,
  `pavement`, `tile-harness`); only the `/lab/` *index* redirects.

The privacy/terms pages can stay plain. Don't restyle the raw-HTML ones.

---

## 4. Phase 1: Horizon replaces the site-wide look

### 4.1 Layout and tokens

- Replace the flax-paper tokens in `src/styles/global.css` with the
  Horizon tokens. Drop Fraunces, Source Serif 4 and IBM Plex Mono from
  `Layout.astro`; load Libre Franklin only.
- Rebuild `Layout.astro`'s header/nav/footer in Horizon. Keep everything
  else in `<head>` (canonical, OG/Twitter, Person JSON-LD) as it is.
- Nav: `Writing · About · Workshop (P100) · Begin`. "Workshop" is the only
  bridge between the rooms in the main nav; the footer can also carry it.
- Keep: light mode only; the focus ring idea (now `2px solid currentColor`,
  `3px` offset); the global reduced-motion rule.

### 4.2 The home page (`/`)

Follow `reference/HorizonPage.dc.html` for layout and type sizes. Sections, top to bottom:

1. **Sky**: nav; drifting phrases (`the restructure`, `what the board
   decides`, `the market`, `AI`, `last quarter's numbers`, `other
   people's opinions`, `the new strategy`); H1 "Plain talk / about hard /
   change."; lede.
2. **Horizon line** (3px, peat).
3. **Band** (rapeseed): "Book a first conversation →" linking to `#begin`;
   "Cambridgeshire, on foot or in a room · and online".
4. **Ground**, with each section a two-column row (yellow label left,
   content right) that stacks on narrow screens:
   - `#work`: What we work on
   - `#how`: How it works (three numbered steps)
   - `#about`: About, **with the portrait** (DECISIONS.md: portrait
     appears on the homepage; use the existing `laurence-timms.webp` /
     `-400.webp` with the current `srcset` approach)
   - `#writing`: the 3 most recent pieces from the `writing` collection,
     with their `maturity` shown, plus a link to `/writing/`
   - `#begin`: the **existing contact form**, moved verbatim from
     `src/pages/coaching/index.astro` (fields, honeypot, Turnstile with
     `data-action="contact"`, status region, submit script). Restyle it
     only. Switch Turnstile to `data-theme="dark"` if that reads better on
     the ground. `/api/contact.ts` is unchanged.
   - Footer: © line, "How AI is used on this site", and "Also: the
     workshop →" linking to `/p100/`.

**Copy.** The reference copy is a draft written by Claude. Use it as
placeholder text, mark it clearly (an HTML comment `<!-- DRAFT COPY -->` on
each block is enough), and **don't invent facts**. Leave these as visible
`[PLACEHOLDERS]` for Laurence: first-conversation length and whether it's
free, session count/length/interval, coaching qualification. Fact-safe:
software since age fifteen; Head of Application Development and Support at
the RSPB; agile and systems coach; PSM II, KMP II, ICAgile Systems
Coaching. **Don't name his current employer anywhere** (DECISIONS.md).

Remove the current homepage's "Unlock your potential" headline and card grid.

### 4.3 Writing pages

Articles are long reads, so don't put them on the dark ground. Use a short
sky header (same time-of-day band, ~200px, title in light weight), the
horizon line, then a **chalk** reading surface with peat text (≈12:1). Keep
the `maturity` badge, `dateModified`, and everything else
`[...slug].astro` does today. The `/writing/` index uses the same pattern.

### 4.4 Done when

- `/` renders Horizon; the sky changes band with local time; reduced
  motion stops the drift and transition.
- The contact form on `/#begin` submits successfully against
  `wrangler dev` with a test Turnstile key, exactly as before.
- Redirects return 301 (check with `curl -I` against `wrangler dev`).
- Every "Must not move" URL still returns 200.
- `DECISIONS.md` has a new **Design** section replacing the flax-paper one:
  the two rooms, the Horizon structure and why it's never spelled out,
  token tables, and the contrast table (§7).

---

## 5. Phase 2: the workshop (`/p100/`)

### 5.1 Projects content collection

Add `projects` to `src/content.config.ts`, modelled on `writing`. One
markdown file per project in `src/content/projects/`; filename = slug.

```ts
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    page: z.number().int().min(300).max(499),   // teletext page number; never reuse one
    kind: z.string(),                            // e.g. "daily tiles", "idle", "team dynamics"
    status: z.enum(['playable', 'in-progress', 'sketch', 'parked']),
    summary: z.string(),                         // one line
    play: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    repo: z.string().optional(),                 // "owner/name": the project's own repo (source of truth)
    deployedPath: z.string().optional(),         // e.g. "public/lab/one-up": an in-repo copy, if any
    draft: z.boolean().default(false),
  }),
});
```

The markdown body holds the project page's notes, especially **how it was
built with Claude** (the part AI collaborators care about).

Numbering: 3xx games, 4xx tools. Page numbers are permanent once assigned.

Seed it with the projects currently on `/lab/` and `/projects/`, plus
CLAUS. Use their existing descriptions. Fill in `repo` only where it's
certain (`laurencetimms/claus`, `laurencetimms/loadedzone`,
`laurencetimms/one-up`); **leave `repo` and `status` as `TODO` for
Laurence on the rest rather than guessing.** A suggested starting map:

| Page | Slug | Notes |
|---|---|---|
| 301 | `pavement` | play `/lab/pavement/`, workshop, tile harness. Also: Underglaze (the Android app) relates to it. Ask Laurence how he wants that shown |
| 302 | `teaspoon-deficit` | play stage one + first version |
| 303 | `one-up` | play `/lab/one-up/` |
| 304 | `shipshap` | no play link |
| 305 | `the-barrow` | no play link |
| 401 | `claus` | links to `/claus/` and the live app |
| 402 | `loadedzone` | links to `/loadedzone/` |
| 403 | `walk` | links to `/walk/` |

### 5.2 `/p100/` index

Follow `reference/Mode7Live.dc.html`:

- Header row: `P100`, `LT-FAX` (yellow), live clock `Wed 25 Nov 17:47/30`
  (client-side; server renders the build time).
- Blue band with yellow double-height **WORKSHOP**, white **LAURENCE TIMMS**,
  then the 12-block colour strip.
- Cyan intro line.
- Index rows: `page · NAME.....kind · STATUS` (dot leaders padded to a
  fixed width), each row linking to `/p100/<slug>/`, sorted by page number.
- Fastext row (bottom): **red** Coaching → `/`, **green** Games →
  `/p100/#games`, **yellow** Tools → `/p100/#tools`, **cyan** Contact →
  `/#begin`.
- Minesweeper in the top-right corner (§5.4).
- **Responsive:** the reference is a fixed 1200px mockup. On narrow
  screens, stack: index first, minesweeper below. Keep the character-grid
  feel with a fixed monospace size that scales by breakpoint, not
  fluid `vw` type.

### 5.3 `/p100/<slug>/`

Same shell (header row, band showing e.g. `P301 PAVEMENT`, Fastext row).
Body: status, kind, summary, play links as prominent cyan links, "last
touched" (Phase 3), then the markdown body rendered in Mode 7 style (white
text, cyan headings, yellow links, no images unless the body includes them).

### 5.4 Easter eggs

**Glitch.** Every 1.5–5s, pick one non-space, non-dot character in the
WORKSHOP heading, the intro, or an index row; cycle it through
`% $ * ! # @ & ? + =` every ~55ms for 6–12 frames; then restore.
Build it so **the real text is always in the HTML**: wrap glitchable
text in an element with the real string, and draw the glitch on an
`aria-hidden` overlay (or swap a single character inside a span that's
`aria-hidden` with a visually hidden copy of the full text alongside).
Screen readers and crawlers must never read a glitched character. No
glitching at all under `prefers-reduced-motion`. Vanilla JS, no framework.

**P888 MINES.** 8×8, 10 mines, logic as in the reference:
- first click is always safe (mines placed after it, excluding its neighbours);
- zero cells flood-open;
- a FLAG toggle button switches click mode (no right-click dependency; works on touch);
- **win only when every safe cell is open AND every mine is flagged and
  no non-mine is flagged**; when all safe cells are open but flags are
  incomplete, show `NOW FLAG n` in yellow;
- hidden cells blue with **white grid lines** (blue vs black is only 2.4:1);
  flags magenta with **black** "F"; numbers 1 cyan, 2 green, 3 yellow, 4 magenta, 5+ red;
- cells are real `<button>`s, ≥44px, `aria-label="Row r, column c: hidden|flagged|n mines nearby|clear|mine"`;
- the status text is `aria-live="polite"`; FLAG uses `aria-pressed`;
- visible focus: `3px solid #FFFF00`, 2px offset.

Ship it as a small vanilla-JS island on `/p100/` only.

### 5.5 Done when

- Adding a project = adding one markdown file; nothing else to touch.
- `/p100/` and every `/p100/<slug>/` render with real text in the HTML
  (view source shows clean, unglitched text).
- The minesweeper works end to end with keyboard only.

---

## 6. Phase 3: making it update itself

### 6.1 Build-time enrichment

At build, for each project, call the GitHub REST API (`fetch` in an Astro
helper, cached per build):

- `repo` set → latest commit date on its default branch → **last touched**.
- `deployedPath` set → latest commit date touching that path **in this
  repo** (`GET /repos/laurencetimms/laurencetimmscom/commits?path=<deployedPath>&per_page=1`).
  Use the API, not `git log`, because the build checkout may be shallow.
- Both set and the source repo is newer than the deployed copy → show a
  `COPY BEHIND SOURCE` flag (black on red) on the index row and project
  page. These in-repo games are unsynced copies of their own repos, so
  this is an honest status and a nudge to re-sync.

Auth: read a `GITHUB_TOKEN` build variable if present (a fine-grained,
read-only, public-repos token, set in Workers Builds settings, never
committed); fall back to unauthenticated. **Fail soft:** if the API
errors or rate-limits, omit the date/flag and log a warning. Never fail the build.

Display as relative and absolute: `last touched 3d ago` with the ISO date
in a `<time datetime>`.

### 6.2 Rebuild schedule

Pushes to `main` already rebuild via Workers Builds. External repos don't,
so add a **nightly** rebuild (~03:00 UK). Check current Cloudflare docs for
whether Workers Builds offers a deploy-hook URL; if so, a scheduled GitHub
Action can POST to it (hook URL stored as a repo secret). If not, a
scheduled GitHub Action that runs `npm ci && npm run build && npx wrangler
deploy` with a scoped `CLOUDFLARE_API_TOKEN` secret. Document whichever is
chosen in DECISIONS.md, including the one-time setup steps Laurence must do
(he sets secrets himself; they never go through an agent).

### 6.3 Done when

- A commit to an external project repo shows up as a new "last touched"
  date on `/p100/` by the next morning, with no change to this repo.
- Unplugging the network during a local build still produces a working site.

---

## 7. Phase 4: AI visibility and accessibility

### 7.1 Machine-readable output

- Generate `llms.txt` at build (an Astro endpoint `src/pages/llms.txt.ts`
  with `prerender = true`) from the `writing` and `projects` collections,
  replacing the hand-written `public/llms.txt`. Keep its existing
  structure and the About/Coaching entries; Coaching now points at `/`.
- Add JSON-LD per project page (`SoftwareApplication` or `VideoGame` as
  appropriate) with `dateModified` from Phase 3 when known. No invented
  ratings (same rule as `/walk/`).
- Sitemap: confirm `/p100/` and project pages are included, and removed
  routes aren't.

### 7.2 Accessibility

Contrast was calculated (WCAG 2.x) for the designs; reproduce this table
in DECISIONS.md and keep to it:

| Pair | Ratio |
|---|---|
| Peat on midday sky (headline/body) | 10.9 |
| Peat on dusk sky (lowest light-sky case) | 5.9 |
| Chalk on night sky | 13.0 |
| Drifting phrases, lowest (dusk / morning / midday) | 4.6 |
| Peat on rapeseed band | 6.5 |
| Chalk on ground | 12.1 |
| Rapeseed labels on ground | 6.5 |
| Muted `#C9C3B6` on ground | 8.3 |
| Mode 7 red on black (lowest text colour) | 5.25 |
| Mode 7 yellow on blue band | 8.0 |
| Black on red flag bar | 5.25 |
| Black "F" on magenta | 6.7 |

Constraints:
- The drifting phrases only just clear 4.5:1. Keep them at weight ≥300
  and size ≥19px. Never use weight 200 below ~40px.
- Rule-on-ground `#6B665C` is 2.55:1, so it's decorative only, and never the only
  marker of an interactive element.
- Touch targets ≥44px (nav links get vertical padding).

Before declaring Phase 4 done: run axe (e.g. `@axe-core/cli` against
`astro preview`) on `/`, `/writing/`, one article, `/p100/`, one project
page, and `404`; fix everything it reports; then a keyboard-only pass
through each (including the contact form and the minesweeper) and a
375px-wide check.

### 7.3 Docs

Update `README.md` (structure, "Adding a project" section mirroring
"Adding a writing piece") and `DECISIONS.md` (two rooms, routes and
redirects, projects collection, GitHub enrichment and nightly rebuild,
glitch accessibility approach, contrast table).

---

## 8. Open questions for Laurence (don't guess; leave TODOs)

1. `repo` and `status` for each project not listed as certain in §5.1.
2. How Underglaze (Android app) relates to Pavement on P100.
3. Whether `/claus/` stays Horizon or moves into the workshop look.
4. Coaching copy placeholders (§4.2) and final wording of the drafted copy.
