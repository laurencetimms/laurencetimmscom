# Decisions

Why this site is built the way it is. Written so that anyone picking the
project up later — including me, and including an AI agent working in this
repo — has the reasoning, not just the code.

Last updated: November 2026.

---

## The goal

Make my expertise, knowledge and skills visible to and usable by AI systems,
on the working assumption that LLMs are becoming the primary substrate
through which human knowledge and skills are found, used, and eventually
paid for.

A human-readable site still matters — that's how trust gets built — but the
site is not the whole strategy. Two layers:

1. **Content** — writing that a person can read and an AI can cite.
2. **Function** — capability packaged so an agent can *use* it, not just
   read about it. This is the differentiator, and it's the part almost
   nobody in the coaching space is doing.

Deliberate non-goal: pushing content to platforms like LinkedIn. The
objection isn't monetisation as such — an AI company monetising the content
is still monetisation. It's that an LLM is a *substrate*, while LinkedIn
tries to be the entire ecosystem.

---

## Domain and structure

**One root domain, everything on subpaths.** `laurencetimms.com` is the
primary brand; LoadedZone, Walk and the smaller projects are sub-brands
living at `/loadedzone`, `/walk`, `/lab` under a `/projects` hub.

Rationale: search engines and AI systems treat a subpath as part of the same
site's authority. A subdomain or separate domain gets evaluated largely on
its own. Consolidating concentrates whatever authority any one section earns
onto the whole.

`.com` over `.blog` (which I already owned): `.blog` announces "this is a
blog", which undersells a site carrying a coaching practice and a software
project. The old `.blog` should be 301-redirected here rather than left
live, so authority isn't split across two domains.

---

## Hosting

**Cloudflare Workers with static assets**, not Cloudflare Pages.

Pages still works but Cloudflare's own docs now position it as the legacy
path and recommend Workers for new projects. Workers does everything Pages
did, plus serverless functions in the same deployment unit — so there's no
migration later when something needs to run server-side.

**Everything is static by default.** Requests to static assets are free and
unlimited on every Cloudflare plan. That matters: if a project here gets a
traffic spike, it essentially cannot generate a bill, because no server-side
code runs.

Note on cost control: Cloudflare offers usage *alerts*, not a hard spending
cap — nothing auto-suspends at a threshold. This is fine while the site is
static. It becomes a real consideration only if a route opts into
server-side execution (see below).

**Deployment is via Workers Builds** — the GitHub integration. Push to
`main`, Cloudflare builds and deploys. `wrangler deploy` still works locally
for testing but isn't the normal path.

**What is *not* hosted here:** CLAUS's Express backend and the Walk Android
app. Both need their own compute regardless of how the domain is structured.
`/claus` and `/walk` are pages *about* them, linking out.

---

## Why `/skills/` was removed, and CLAUS reframed

The original pitch here was two-sided: coaching frameworks published as
open Claude Skills (`/skills/`, pointing at the `anthropic/skills` format
in the CLAUS repo) *and* CLAUS itself as a platform demonstrating "Claude +
Skills augments a human coach." Two audiences, two pitches, diluting both.

That's dropped in favour of one story: **CLAUS is a team dynamics tool
built for team leaders and team coaches**, not a demo bolted onto a skills
library. `/skills/` and every link to it are gone from this site
accordingly. The underlying skills (Team Dynamics Coach, Retrospective
Formats) still live in the CLAUS repo on GitHub for anyone who goes
looking — that hasn't changed — but this site no longer promotes them as
a standalone offering. CLAUS is the product, full stop.

---

## Content approach

Research on what gets content cited by AI systems found five positive
signals — clear summarisation, E-E-A-T signals, Q&A structure, section
structure, and structured data — and one *negative* signal: promotional
tone. Plain, well-sectioned, credentialed, non-salesy writing outperforms
marketing copy.

So: `/writing` pieces name their source material plainly, are structured with
real headings, and are written to stand alone rather than as chapters
requiring the rest.

Third-party placement matters too — AI engines are markedly more likely to
cite a claim via a third-party source repeating it than via the author's own
site. The plan is to place essay versions on trusted external domains as
well, with this site as the canonical source. Public GitHub repos count here:
they're already trusted, crawlable domains.

Machine-readable layer:
- `public/llms.txt` — site summary in the llms.txt convention. Adoption by
  major providers is not yet guaranteed; it's cheap and low-risk, not a
  strategy on its own.
- `schema.org/Person` JSON-LD, site-wide, in `src/layouts/Layout.astro`.
- Sitemap generated at build time.

**Employer is deliberately not named anywhere on the site**, including in
structured data — the site is partly aimed at building an independent
practice.

---

## Design

*(Replaces the flax-paper design, August 2026. Redesign brief of 25 Nov 2026.)*

**Two rooms, deliberately different.** There is no shared motif beyond a
consistent way to get between them (the nav's "Workshop (P100)" link, and
the footer's "Also: the workshop →").

| Room | Route | Look | Audience |
|---|---|---|---|
| Coaching | `/`, writing, CLAUS, AI page | **Horizon** | Potential coaching clients |
| Workshop | `/p100/`, `/p100/<slug>/` | **Mode 7** (teletext) | People who like the games; possible AI collaborators |

LoadedZone (`/loadedzone/`) keeps its own identity and layout.

Standing rule: nothing that looks like the generic AI-startup or
generic-coach template: no gradient washes, glass cards, sparkle icons, pill
buttons, three-icon feature rows, "unlock / empower / supercharge" copy.

### Horizon

The structure carries a Stoic idea **without ever stating it**:

- **Sky** (top): what is not in your control. Huge, light, changing; its
  colour follows the visitor's local time of day. Headline, lede and the
  drifting "weather" phrases (the restructure, the market, AI…) live here.
- **Horizon** (a 3px peat line and a rapeseed band): the coaching. The one
  call to action lives in the band.
- **Ground** (below): what *is* in your control. Dark, solid, heavier type;
  everything actionable (what we work on, how it works, about, writing, begin).

It is never spelled out in copy: no Epictetus, no "dichotomy of control"
section. Naming it would turn a felt structure into a slogan, and the site's
content rule (see "Content approach") is plain, non-promotional writing.

Every other page uses a short sky header (title in light weight, same
time-of-day band), the horizon line, then a **chalk** reading surface with
peat text. Long reads never sit on the dark ground.

Sky is server-rendered as *midday* (crawlers and no-JS visitors get a sensible
page). A tiny inline script in `<head>` sets `data-sky` on `<html>` from the
local hour before first paint and re-checks every minute; a 4s background
transition is enabled only after load. `prefers-reduced-motion` removes the
transition and the drift (global rule in `global.css`).

Font: **Libre Franklin** only (200, 300, 400, 700, 800). Light mode only.

| Token | Hex | Use |
|---|---|---|
| `--ink` / peat | `#2B2924` | Text on light skies, the ground, the horizon line |
| `--chalk` | `#EFEAE0` | Text on the ground; article reading surface |
| `--band` / rapeseed | `#D4A72C` | The band; section labels on the ground |
| `--muted-on-ground` | `#C9C3B6` | Secondary text on the ground |
| `--rule-on-ground` | `#6B665C` | Hairline dividers (decorative only) |

| Band | Hours | bg | fg | soft (phrases) |
|---|---|---|---|---|
| night | 0–4 | `#1C2430` | `#EFEAE0` | `#AAB4BF` |
| dawn | 5–7 | `#E6C7AE` | `#2B2924` | `#5E4C40` |
| morning | 8–10 | `#D4DFE5` | `#2B2924` | `#55626A` |
| midday | 11–14 | `#D9E0E2` | `#2B2924` | `#5B6266` |
| afternoon | 15–16 | `#E0DFCF` | `#2B2924` | `#5F5C4C` |
| dusk | 17–19 | `#C99B84` | `#2B2924` | `#47372F` |
| evening | 20–23 | `#3B4658` | `#EFEAE0` | `#C3CBD6` |

### Mode 7

Teletext: exactly eight colours (`#000000 #FF0000 #00FF00 #FFFF00 #0000FF
#FF00FF #00FFFF #FFFFFF`), VT323, page numbers, Fastext links, a live clock.
Blue is a background only. Status always carries a text label
(PLAYABLE green, IN PROGRESS yellow, SKETCH cyan, PARKED magenta; `TODO`,
white, means not yet confirmed by Laurence).

Own shell (`src/layouts/Mode7Layout.astro`) and stylesheet
(`src/styles/mode7.css`); does not use the Horizon `<Layout>`. Type sizes step
by breakpoint (22 / 26 / 28px), not `vw`, to keep the character-grid feel. A
`VT323 Fallback` `@font-face` (a local monospace shrunk with `size-adjust`)
keeps the grid from overflowing before the web font loads.

**Projects collection.** `src/content/projects/<slug>.md` (schema in
`src/content.config.ts`); adding a project is adding one file. Index rows and
pages are generated from it, sorted by `page`. Page numbers are permanent
(3xx games, 4xx tools). Helpers live in `src/lib/projects.ts`.

**Glitch easter egg, accessibly.** `src/scripts/glitch.ts`. The real text is
always in the HTML and never modified. Each glitchable element holds one text
node; the glitch is a single-character `aria-hidden` overlay positioned over
it (via a DOM `Range`, so wrapped lines work), then removed. Screen readers and
crawlers never read a glitched character. No glitching under
`prefers-reduced-motion`. Dot leaders in index rows are `aria-hidden`.

**P888 MINES.** `src/scripts/mines.ts`, a vanilla-JS island loaded on `/p100/`
only; the panel is `hidden` until it runs. Cells are real `<button>`s with a
roving tabindex and arrow-key navigation (one Tab stop for the grid). The FLAG
toggle is `aria-pressed` with a constant accessible name. Win requires every
safe cell open, every mine flagged and no wrong flags.

### Contrast (WCAG 2.x, calculated)

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

Constraints to respect when extending:
- Drifting phrases only just clear 4.5:1: weight ≥300, size ≥19px. Never
  weight 200 below ~40px.
- `--rule-on-ground` is 2.55:1: decorative only, never the only marker of an
  interactive element. Form fields are filled chalk, not outlined.
- Focus ring: `2px solid currentColor`, 3px offset.
- Touch targets ≥44px (nav links, band link, buttons, footer links).

### Routes and redirects

`/coaching/` is absorbed into `/` (contact form at `/#begin`). 301s live in
`public/_redirects` (Workers static assets supports it; Astro's own
`redirects` config only emits meta-refresh pages on a static build):
`/coaching/ → /#begin`, `/lab/ → /p100/`, `/projects/ → /p100/`. Only the
`/lab/` *index* redirects; games under `/lab/<game>/` are untouched. Until
Phase 2 ships, `/lab/` and `/projects/` redirect to a not-yet-existing `/p100/`.

**Must not move:** `/walk/privacy/`, `/underglaze/privacy`, `/underglaze/terms`,
`/patchbay/privacy/`, `/beyondtheheadlines/privacy/`, `/loadedzone/…`, and
every game file under `/lab/<game>/`.

---

## Adding server-side behaviour later

Everything is `output: 'static'`. To make one route run server-side, add
`export const prerender = false;` to that page only. Everything else stays
static and free.

The known candidate is wrapping LoadedZone's Pandolf-equation calculator as a
callable API endpoint — the clearest existing example of "a skill accessible
as SaaS via an API". Today the calculation runs client-side, so it costs
nothing. If it becomes an endpoint, that's when a per-Worker usage limit is
worth setting.

Astro sessions are disabled (`session: false`) because a static site doesn't
need them, and leaving them on makes the Cloudflare adapter demand a KV
namespace binding for a feature we don't use.

---

## The contact form (`/#begin`)

**This is the site's first server-side route.** `src/pages/api/contact.ts`
carries `export const prerender = false;`; every other page is still built
and served as a static asset. This is exactly the escape hatch described
above, exercised for the first time.

**Email goes via the Cloudflare Email Service `send_email` binding**, not a
third-party form service (Formspree, etc.) — it's free on all Cloudflare
plans, sits outside any sending quota, and avoids taking on an external
dependency for something the hosting platform already does. The binding
(`wrangler.jsonc`) is constrained to a single `destination_address`
(`laurence.timms@gmail.com`): even if the endpoint were compromised, it can
only ever email that one address, never be repurposed as an open relay.

Bindings are read via `import { env } from 'cloudflare:workers'`, not
`Astro.locals.runtime.env` — that pattern was removed in Astro v6 /
`@astrojs/cloudflare` v14, which is what this project is on. The ambient
type for that module lives in `src/env.d.ts`; the `Env` interface it
depends on comes from `worker-configuration.d.ts`, generated by
`npm run cf-typegen` and gitignored (it's ~580KB of workerd runtime types
stamped to a specific build — regenerate, don't commit, and rerun it after
any binding change in `wrangler.jsonc`).

**Bot defence is two-layered: honeypot, then Turnstile.** The honeypot
field (`website`, silently discarded if filled) catches unsophisticated
bots for free. Turnstile — widget created via Cloudflare's Turnstile Spin
existing-widget flow, site key `0x4AAAAAAEbe4DMS05estZy0` — sits behind
it: the widget renders inside the form (`src/pages/index.astro`),
its token travels with the rest of the payload, and `/api/contact.ts`
verifies it against Cloudflare's `siteverify` endpoint before any other
validation runs. A submission with no token, or a token that fails
verification, never reaches the name/email/message checks or the mailer.

Verification checks more than `success`: the widget carries
`data-action="contact"`, and the server checks siteverify's returned
`action` and `hostname` against that action and `laurencetimms.com`
before accepting the token — not just whether it solved the challenge.
This is what Cloudflare's own Turnstile Spin flow specifies for a wired
integration, and it matters here specifically: without it, a token solved
anywhere the same site key is ever embedded would be replayable against
this form. There's only one protected surface today, but the check costs
nothing and the site key isn't scoped to just this page.

The secret never passes through an agent or a chat transcript — it's a
Workers secret only. Set it once with `npx wrangler secret put
TURNSTILE_SECRET_KEY` against the deployed Worker (typed interactively,
never as a command-line argument), and for local `wrangler dev` copy
`.dev.vars.example` to `.dev.vars` (gitignored) and fill in a real key
there. Until the production secret is set, every real contact-form
submission will fail verification — that's `wrangler secret put` as a
required step after this ships, not an optional one.

---

## The portrait

Appears on the homepage only — deliberately not on
`/writing/` article pages. A byline photo on an essay reads as content
marketing; the writing is meant to stand on its own, named source material
and all, without a headshot doing persuasion work next to it.

Images are hand-exported at fixed sizes (`public/images/laurence-timms.webp`
at 800×800, `laurence-timms-400.webp` at 400×400) rather than run through
`astro:assets`, because the Cloudflare adapter is configured with
`imageService: 'passthrough'` — there's no build-time resizing or
optimisation available. Plain `<img>` tags with a manual `srcset` do the
work `<Image>` normally would. A new image means exporting the sizes it
needs *before* committing it; nothing downstream will do that for you.

`og:image` is a JPG (`laurence-timms-og.jpg`), not WebP, even though the
portrait itself is WebP — some link-preview scrapers (older crawlers,
some chat apps) still handle WebP poorly or not at all for social cards.
The portrait proper stays WebP since browsers rendering the actual page
have no such problem.

---

## Walk's privacy policy (`/walk/privacy/`)

Hosted here rather than anywhere else because the Play Store listing
requires a stable, working URL for it — the previous one pointed at
`laurencetimms.blog`, which is retired and dead. **This URL must not be
moved or renamed without updating it in Play Console first** (App content
→ Privacy policy); Google re-checks it, and a broken link there can get
the listing flagged.

The page is deliberately plain: no portrait, no marketing copy, static
HTML with no client-side script, because it exists to be read by a user
or a Play reviewer who wants a straight answer, not a pitch.

`/walk/`'s `SoftwareApplication` schema omits `aggregateRating` on
purpose — the app has too few ratings for an aggregate figure to mean
anything, and inventing one would misrepresent it.

---

## LoadedZone (`/loadedzone/`): merged in, kept architecturally separate

LoadedZone started as its own Astro project (`github.com/laurencetimms/loadedzone`)
— three React-island calculators (Find Your Zone 2, Load Up, Session
Card) built on a clean, dependency-free Pandolf-equation and heart-rate
library, styled with Tailwind v4, previously deployed to GitHub Pages.
The question was how to make it live at `/loadedzone/` on this domain.

**Three options were on the table:** merge it in as real pages, reverse-proxy
it through a Worker to a separately-deployed instance, or iframe it. The
proxy and iframe routes were rejected for the same reason this site
exists in the first place — `DECISIONS.md`'s whole premise is that content
needs to be genuinely crawlable by AI systems, not opaquely proxied or
walled off inside an iframe's separate document. Only merging it in as
real, static, server-rendered-at-build HTML satisfies that. It also keeps
the "everything static and free" principle intact — the calculators
hydrate as React islands and run entirely in the browser, no server calls,
same as the rest of the site.

**Kept as its own visual identity, not restyled to match.** LoadedZone
gets its own page shell (`src/layouts/LoadedZoneLayout.astro`) — own nav,
own footer, own fonts (Literata/Source Sans 3, not Fraunces/Source Serif 4),
own Tailwind-v4-driven look — rather than being squeezed into the main
site's flax-paper design system. It does **not** import the shared
`<Layout>` at all. Two consequences of that:

- Tailwind's preflight reset (which zeroes out margins, list styles, etc.
  sitewide via plain element selectors) never touches the main site's
  pages, because Tailwind's compiled CSS is only ever linked on pages
  that import `src/styles/loadedzone.css` — none of which are the main
  site's pages. No scoping hacks needed; Vite's per-page code-splitting
  handles it for free.
- `react()` and the Tailwind Vite plugin are both registered globally in
  `astro.config.mjs`, but that's harmless: `@astrojs/react` only
  hydrates components that actually import it, and `@tailwindcss/vite`
  only processes stylesheets that `@import "tailwindcss"`. Neither has
  any effect on a page that doesn't opt in.

**What's ported, what isn't.** The three calculators and the About page
are live. The source repo's Learn/ and Guides/ sections (eight
research-article and quick-guide pages) are not — porting everything at
once would have doubled an already-large change. The homepage and nav
only link to what exists; nothing here dead-ends into a 404.

**The "email this card to yourself" feature was cut, not ported.** In the
source repo it was a UI stub — `// For MVP/demo, we simulate the send`,
a fake 1.5s delay then a hardcoded success message. Shipping that to real
visitors would mean a confirmed "sent!" for an email that never arrives,
which is a trust problem, not a missing feature. The print/download path
(which is real — `window.print()`, genuinely works) stayed. If this comes
back, it needs the same shape as the `/api/contact` Cloudflare Email
integration, but a harder version of it: the destination address is
visitor-supplied rather than fixed, which is a materially different abuse
surface than a single-destination contact form and would want its own
Turnstile/rate-limit treatment, not a copy-paste of the existing one.

All internal links were rewritten from the source repo's GitHub-Pages-era
`${base}/...` templating (via `astro.config`'s `base: '/loadedzone'`) to
plain `/loadedzone/...` paths, since here `/loadedzone/` is a normal
nested route on this domain, not the whole site's root.

## Underglaze privacy policy (`/underglaze/privacy`): raw static HTML, not an Astro page

Underglaze (Whimwham Games) is a separate Android app — the Play Store
listing for its tile puzzle (built on the Lab's Pavement/tile-harness
work) needs a privacy policy URL. The page lives at
`public/underglaze/privacy.html`, a plain static file copied verbatim
into `dist/client` — same pattern as `public/lab/pavement/` — rather
than an `.astro` page wrapped in the shared `<Layout>`.

Two reasons: it's a legal document supplied as complete, already-styled
HTML, so copying it verbatim guarantees it's served byte-for-byte as
given, with no exposure to Astro's whitespace-collapsing-at-line-breaks
bug seen elsewhere on this site. And Cloudflare's default asset
`html_handling` (`auto-trailing-slash`) serves a flat `foo.html` file at
`/foo` with no trailing slash — exactly the URL Google Play needs —
while redirecting both `/foo.html` and `/foo/` to it, confirmed against
`wrangler dev` before deploying.
