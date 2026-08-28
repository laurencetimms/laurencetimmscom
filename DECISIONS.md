# Decisions

Why this site is built the way it is. Written so that anyone picking the
project up later — including me, and including an AI agent working in this
repo — has the reasoning, not just the code.

Last updated: August 2026.

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
blog", which undersells a site carrying a coaching practice, a software
project, and published agent skills. The old `.blog` should be 301-redirected
here rather than left live, so authority isn't split across two domains.

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

## Skills: the function layer

Coaching frameworks are published as **Claude Skills in the open
`anthropic/skills` format**. The format became a cross-platform open standard
in December 2025, so a published skill isn't a Claude-only artefact — it's a
portable capability package other agent platforms can load.

This is the closest thing currently available to "my expertise is directly
usable by an AI agent" rather than merely readable.

**Policy: published skills default to free loss-leaders / marketing.**
Whether any individual skill moves to paid access is decided case by case,
not as a blanket rule. CLAUS in particular demonstrates the "Claude + Skills
augments a human coach" argument better as an open demo than behind a
paywall.

GitHub is the canonical home for skills, not this site. `/skills` is an index
pointing there. Public skill directories will come and go; the repo is the
durable source of truth.

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

Light mode only, by choice. No `prefers-color-scheme: dark` handling. The
flax-paper aesthetic is the point; someone with dark mode set system-wide
gets the paper anyway. Revisit only if it becomes a real complaint.

Palette and type live in `src/styles/global.css`. Flax paper, bracken ink,
a green accent, heather for sub-brand badges — drawn from a British pastoral
sensibility rather than the default template look.

Accessibility, verified by calculating WCAG contrast ratios rather than
eyeballing:

| Pair | Ratio |
|---|---|
| Body ink on paper | 12.01 (AAA) |
| Body ink on card | 13.14 (AAA) |
| Muted text on paper | 6.82 (AA) |
| Muted text on card | 7.46 (AAA) |
| Green accent on paper | 5.68 (AA) |
| Green accent on card | 6.21 (AA) |

Known constraints to respect when extending:
- Fraunces has high stroke contrast — don't use it below ~18px.
- The mono nav sits at 11px, close to the legibility floor. Don't go smaller.
- Hairline borders are 1.44 against paper. Fine as decoration, but a border
  must never be the *only* thing marking an interactive element. Relevant
  when forms get added.
- The focus ring is 2px solid green with a 3px offset — not colour alone.

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

## The contact form (`/coaching/`)

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
it: the widget renders inside the form (`src/pages/coaching/index.astro`),
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

Appears on `/coaching/` and the homepage only — deliberately not on
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
