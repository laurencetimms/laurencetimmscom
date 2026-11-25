import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Writing is published early and improved in place rather than polished
// offline and released once — `maturity` makes that explicit to readers
// instead of hiding it. See DECISIONS.md.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    maturity: z.enum(['alpha', 'beta', 'current']).default('alpha'),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draws_on: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// The workshop (/p100/). One markdown file per project; filename = slug.
// Page numbers are permanent once assigned: 3xx games, 4xx tools.
// `status: TODO` means Laurence hasn't confirmed it yet (shown as TODO).
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    page: z.number().int().min(300).max(499),
    kind: z.string(),
    status: z.enum(['playable', 'in-progress', 'sketch', 'parked', 'TODO']),
    summary: z.string(),
    play: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    repo: z.string().optional(),
    deployedPath: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing, projects };
