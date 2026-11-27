import type { APIRoute } from 'astro';
import { json, requireAccess, requireEditorHeader } from '../../../lib/serial/access';
import { MARK_KINDS, serialDb, type MarkKind } from '../../../lib/serial/db';

// The author's marks on the serial: week breaks, extras, type changes,
// notes and hidden ornaments. GET lists them all; PUT creates or replaces
// one; DELETE ?id=… removes one.
export const prerender = false;

const MAX_NOTE = 4000;
const MAX_TITLE = 300;

export const GET: APIRoute = async ({ request }) => {
  const denied = await requireAccess(request);
  if (denied) return denied;
  const { results } = await serialDb()
    .prepare('SELECT id, block_id, kind, note, title, updated_at FROM marks')
    .all();
  return json({ marks: results });
};

export const PUT: APIRoute = async ({ request }) => {
  const denied = (await requireAccess(request)) ?? requireEditorHeader(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected JSON.' }, 400);
  }
  const blockId = typeof body.block_id === 'string' ? body.block_id : '';
  const kind = body.kind as MarkKind;
  const note = typeof body.note === 'string' ? body.note.slice(0, MAX_NOTE) : '';
  const title = typeof body.title === 'string' ? body.title.slice(0, MAX_TITLE) : '';
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(blockId) || !MARK_KINDS.includes(kind)) {
    return json({ error: 'Bad block or kind.' }, 400);
  }

  const db = serialDb();
  const exists = await db.prepare('SELECT 1 FROM blocks WHERE id = ?').bind(blockId).first();
  if (!exists) return json({ error: 'No such block.' }, 404);

  const id = `${blockId}:${kind}`;
  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO marks (id, block_id, kind, note, title, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET note = excluded.note, title = excluded.title, updated_at = excluded.updated_at`,
    )
    .bind(id, blockId, kind, note, title, updatedAt)
    .run();
  return json({ id, block_id: blockId, kind, note, title, updated_at: updatedAt });
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const denied = (await requireAccess(request)) ?? requireEditorHeader(request);
  if (denied) return denied;
  const id = url.searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9_-]{1,40}:[a-z]{1,10}$/.test(id)) return json({ error: 'Bad id.' }, 400);
  await serialDb().prepare('DELETE FROM marks WHERE id = ?').bind(id).run();
  return json({ id, deleted: true });
};
