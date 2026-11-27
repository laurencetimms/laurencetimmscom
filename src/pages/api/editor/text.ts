import type { APIRoute } from 'astro';
import { json, requireAccess } from '../../../lib/serial/access';
import { serialDb } from '../../../lib/serial/db';

// The whole text of the serial, as [id, kind, body] triples in reading
// order. About 1.5 MB, so the editor caches it and sends ?have=<version>:
// if that's still current, we answer with just the version.
export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const denied = await requireAccess(request);
  if (denied) return denied;

  const db = serialDb();
  const meta = await db.prepare("SELECT value FROM meta WHERE key = 'text_version'").first<{ value: string }>();
  const version = meta?.value ?? '';
  if (version && url.searchParams.get('have') === version) return json({ version, unchanged: true });

  const { results } = await db
    .prepare('SELECT id, kind, body FROM blocks ORDER BY pos')
    .all<{ id: string; kind: string; body: string }>();
  const blocks = results.map((r) => [r.id, r.kind, JSON.parse(r.body)]);
  return json({ version, blocks });
};
