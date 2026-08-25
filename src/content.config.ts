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

export const collections = { writing };
