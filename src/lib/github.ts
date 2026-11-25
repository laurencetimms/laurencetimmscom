// Build-time GitHub enrichment (Phase 3). Fails soft: any error, rate limit or
// missing network just means "no date"; it never fails the build.
// Auth: an optional GITHUB_TOKEN build variable (fine-grained, read-only,
// public repos). Never committed. Unauthenticated is the fallback.

const THIS_REPO = 'laurencetimms/laurencetimmscom';
const TIMEOUT_MS = 8000;

const cache = new Map<string, Promise<Date | null>>();
let offline = false; // after one network-level failure, skip the rest of the build's calls

function token(): string | undefined {
  return (
    (typeof process !== 'undefined' ? process.env?.GITHUB_TOKEN : undefined) ||
    (import.meta.env as Record<string, string | undefined> | undefined)?.GITHUB_TOKEN ||
    undefined
  );
}

async function latestCommitDate(repo: string, path?: string): Promise<Date | null> {
  if (offline) return null;
  const qs = new URLSearchParams({ per_page: '1' });
  if (path) qs.set('path', path);
  const url = `https://api.github.com/repos/${repo}/commits?${qs}`;
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'site-build',
    'x-github-api-version': '2022-11-28',
  };
  const t = token();

  try {
    const get = (auth: boolean) =>
      fetch(url, {
        headers: auth && t ? { ...headers, authorization: `Bearer ${t}` } : headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    let res = await get(true);
    // A stale or revoked token must not blank every date: retry anonymously.
    if (t && res.status === 401) {
      console.warn('[github] GITHUB_TOKEN was rejected (401); retrying unauthenticated');
      res = await get(false);
    }
    if (!res.ok) {
      console.warn(`[github] ${repo}${path ? ` (${path})` : ''}: HTTP ${res.status}; omitting date`);
      return null;
    }
    const data = (await res.json()) as any[];
    const iso = data?.[0]?.commit?.committer?.date ?? data?.[0]?.commit?.author?.date;
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.valueOf()) ? d : null;
  } catch (err) {
    offline = true;
    console.warn(`[github] network error (${(err as Error).name}); skipping GitHub enrichment for the rest of this build`);
    return null;
  }
}

function cached(repo: string, path?: string) {
  const key = `${repo}::${path ?? ''}`;
  if (!cache.has(key)) cache.set(key, latestCommitDate(repo, path));
  return cache.get(key)!;
}

export interface Touched {
  /** Latest commit on the project's own repo (source of truth). */
  source: Date | null;
  /** Latest commit touching the in-repo copy, in this repo. */
  deployed: Date | null;
  /** What to show as "last touched": source if known, else the in-repo copy. */
  last: Date | null;
  /** Both known and the source repo is newer than the deployed copy. */
  behind: boolean;
}

export async function getTouched(opts: { repo?: string; deployedPath?: string }): Promise<Touched> {
  // Use the API, not `git log`: the build checkout may be shallow.
  const [source, deployed] = await Promise.all([
    opts.repo ? cached(opts.repo) : null,
    opts.deployedPath ? cached(THIS_REPO, opts.deployedPath) : null,
  ]);
  return {
    source,
    deployed,
    last: source ?? deployed,
    behind: !!(source && deployed && source.valueOf() > deployed.valueOf()),
  };
}

/** "3d ago" style. */
export function ago(d: Date, now = new Date()): string {
  const s = Math.max(0, Math.floor((now.valueOf() - d.valueOf()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  if (days < 730) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
