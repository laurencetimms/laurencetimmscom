import { getCollection } from 'astro:content';

export const STATUS_LABEL = {
  playable: 'PLAYABLE',
  'in-progress': 'IN PROGRESS',
  sketch: 'SKETCH',
  parked: 'PARKED',
  TODO: 'TODO',
} as const;

/** Published projects, sorted by teletext page number. */
export async function getProjects() {
  return (await getCollection('projects', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.page - b.data.page,
  );
}

/** Fixed-width dot leader so NAME.....kind lines up in the character grid. */
export const ROW_WIDTH = 32;
export function leader(name: string, kind: string) {
  return '.'.repeat(Math.max(2, ROW_WIDTH - name.length - kind.length));
}
