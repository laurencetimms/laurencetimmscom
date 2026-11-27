// Server-side gate for the serial editor's API (/api/editor/*).
//
// The editor and its API sit behind Cloudflare Access (Zero Trust), which
// signs every request it lets through with a JWT in the
// `Cf-Access-Jwt-Assertion` header. Access alone already blocks anyone who
// isn't on the policy, but we verify the token here too, so the API stays
// closed even if the Access application is misconfigured or removed, or the
// Worker is reached by another route (e.g. workers.dev). Fails closed: no
// configuration means no access. See DECISIONS.md → "The serial editor".
import { env } from 'cloudflare:workers';

interface AccessEnv {
  ACCESS_TEAM_DOMAIN?: string; // e.g. "laurence.cloudflareaccess.com"
  ACCESS_AUD?: string; // the Access application's "Application Audience (AUD) Tag"
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

let certCache: { team: string; keys: Jwk[]; fetchedAt: number } | null = null;
const CERT_TTL_MS = 60 * 60 * 1000;

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson<T>(s: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s))) as T;
}

async function getKeys(team: string, force = false): Promise<Jwk[]> {
  const fresh = certCache && certCache.team === team && Date.now() - certCache.fetchedAt < CERT_TTL_MS;
  if (fresh && !force) return certCache!.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`access certs: HTTP ${res.status}`);
  const data = (await res.json()) as { keys?: Jwk[] };
  certCache = { team, keys: data.keys ?? [], fetchedAt: Date.now() };
  return certCache.keys;
}

function deny(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/**
 * Returns null if the request carries a valid Access token for this
 * application, or a 401/500 Response to send back instead.
 * In `astro dev` the check is skipped so the editor can be worked on locally.
 */
export async function requireAccess(request: Request): Promise<Response | null> {
  if (import.meta.env.DEV) return null;

  const { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: aud } = env as unknown as AccessEnv;
  if (!team || !aud) {
    console.error('serial editor: ACCESS_TEAM_DOMAIN / ACCESS_AUD secrets are not set');
    return deny(500, 'Editor is not configured.');
  }

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return deny(401, 'Not signed in.');

  const parts = token.split('.');
  if (parts.length !== 3) return deny(401, 'Bad token.');

  try {
    const header = b64urlJson<{ kid?: string; alg?: string }>(parts[0]);
    const payload = b64urlJson<{ aud?: string | string[]; exp?: number; nbf?: number; iss?: string }>(parts[1]);
    if (header.alg !== 'RS256') return deny(401, 'Bad token.');

    let keys = await getKeys(team);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      // Access rotates its keys; refetch once before giving up.
      keys = await getKeys(team, true);
      jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) return deny(401, 'Unknown signing key.');

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), signed);
    if (!ok) return deny(401, 'Bad signature.');

    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return deny(401, 'Wrong audience.');
    if (payload.iss !== `https://${team}`) return deny(401, 'Wrong issuer.');
    if (typeof payload.exp !== 'number' || payload.exp < now) return deny(401, 'Session expired.');
    if (typeof payload.nbf === 'number' && payload.nbf > now + 60) return deny(401, 'Token not yet valid.');
    return null;
  } catch (err) {
    console.error('serial editor: access check failed', err);
    return deny(401, 'Could not verify sign-in.');
  }
}

/** Cross-site requests can't add custom headers without a CORS preflight,
 * which this API never grants — so requiring one blocks CSRF on writes. */
export function requireEditorHeader(request: Request): Response | null {
  return request.headers.get('x-serial-editor') === '1' ? null : deny(403, 'Missing editor header.');
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
