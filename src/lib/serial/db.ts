// D1 access for the serial editor. The binding is declared in wrangler.jsonc.
import { env } from 'cloudflare:workers';

export function serialDb(): D1Database {
  const db = (env as unknown as { SERIAL_DB?: D1Database }).SERIAL_DB;
  if (!db) throw new Error('SERIAL_DB binding is missing (see wrangler.jsonc)');
  return db;
}

export const MARK_KINDS = ['break', 'extra', 'type', 'note', 'hide'] as const;
export type MarkKind = (typeof MARK_KINDS)[number];
