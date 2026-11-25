// Generated at build from the `writing` and `projects` collections, so adding
// a markdown file updates it. Replaces the hand-written public/llms.txt.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

const SITE = 'https://laurencetimms.com';

export const GET: APIRoute = async () => {
  const writing = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );
  const projects = (await getCollection('projects', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.page - b.data.page,
  );

  const lines = [
    '# Laurence Timms',
    '',
    '> Coach working with leaders and teams through organisational change,',
    '> software delivery improvement, and AI-augmented coaching practice.',
    '> Background in software engineering. Building CLAUS, an AI-augmented',
    '> team dynamics tool for team leaders and team coaches.',
    '',
    'Coaching practice: organisational-psychology-informed change coaching for',
    'technology and public-sector delivery organisations.',
    '',
    '## Writing',
    `- [Writing index](${SITE}/writing/): frameworks and essays on coaching, organisational change, and software delivery`,
    ...writing.map((e) => `- [${e.data.title}](${SITE}/writing/${e.id}/): ${e.data.description}`),
    '',
    '## Coaching',
    `- [Coaching](${SITE}/): approach, how it works, and how to get in touch (contact form at ${SITE}/#begin)`,
    '',
    '## About',
    `- [How AI is used on this site](${SITE}/ai/): where AI was involved in writing and building this site and its tools, and where it wasn't`,
    '',
    '## Projects',
    `- [Workshop index (P100)](${SITE}/p100/): software and game projects, each with a teletext page number`,
    ...projects.map((p) => `- [${p.data.title}](${SITE}/p100/${p.id}/): ${p.data.summary}`),
    `- [CLAUS (live application)](https://claus.laurencetimms.com): the running platform, not just a page about it`,
    `- [CLAUS source](https://github.com/laurencetimms/claus): Team Dynamics Coach, Retrospective Formats`,
    `- [Walk privacy policy](${SITE}/walk/privacy/): what Walk collects (nothing), and the permissions it requests`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
