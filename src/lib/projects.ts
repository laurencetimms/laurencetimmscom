import { getCollection } from 'astro:content';
import { getTouched } from './github';

export const STATUS_LABEL = {
  playable: 'PLAYABLE',
  'in-progress': 'IN PROGRESS',
  sketch: 'SKETCH',
  parked: 'PARKED',
  TODO: 'TODO',
} as const;

/** Published projects, sorted by teletext page number, each with GitHub "touched" info. */
export async function getProjects() {
  const entries = (await getCollection('projects', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.page - b.data.page,
  );
  return Promise.all(
    entries.map(async (entry) => ({
      entry,
      touched: await getTouched({ repo: entry.data.repo, deployedPath: entry.data.deployedPath }),
    })),
  );
}

/** Fixed-width dot leader so NAME.....kind lines up in the character grid. */
export const ROW_WIDTH = 32;
export function leader(name: string, kind: string) {
  return '.'.repeat(Math.max(2, ROW_WIDTH - name.length - kind.length));
}
