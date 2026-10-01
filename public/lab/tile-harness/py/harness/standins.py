"""Procedural stand-in textures, so the whole pipeline runs before any image generation.

Each is a plain 512x512 image of one material, the same kind of image the
Gemini prompts ask for. Replace them with generated or photographed ones by
dropping files into textures/raw/ named <kind>__<anything>.png.
"""
import numpy as np, cv2

S = 512


def fbm(rs, size=S, octaves=6, base=4, falloff=.55):
    out = np.zeros((size, size), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        n = base * 2 ** o
        g = rs.normal(0, 1, (n + 1, n + 1)).astype(np.float32)
        g[-1, :] = g[0, :]; g[:, -1] = g[:, 0]                       # wrap, so the texture tiles
        up = cv2.resize(g, (size + size // n, size + size // n), interpolation=cv2.INTER_CUBIC)[:size, :size]
        out += amp * up; tot += amp; amp *= falloff
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


def specks(rs, n, rmin, rmax, size=S):
    m = np.zeros((size, size), np.float32)
    for _ in range(n):
        x, y = rs.integers(0, size, 2); r = rs.uniform(rmin, rmax)
        cv2.circle(m, (int(x), int(y)), max(1, int(r)), float(rs.uniform(.5, 1)), -1, lineType=cv2.LINE_AA)
    return m


def clay(rs):
    tone = fbm(rs, base=3)[..., None]; grain = fbm(rs, base=48, octaves=3)[..., None]
    base = np.array([143, 58, 30], np.float32) * (0.82 + .3 * tone) * (0.94 + .12 * grain)
    base = base * (1 - .35 * specks(rs, 900, .6, 1.6)[..., None]) + np.array([210, 170, 120]) * specks(rs, 400, .5, 1.3)[..., None] * .5
    return np.clip(base, 0, 255).astype(np.uint8)


def slip(rs):
    tone = fbm(rs, base=4)[..., None]; streak = cv2.GaussianBlur(rs.normal(0, 1, (S, S)).astype(np.float32), (0, 0), sigmaX=18, sigmaY=1.5)[..., None]
    base = np.array([236, 210, 154], np.float32) * (0.9 + .14 * tone) + streak * 18
    base = base * (1 - .55 * specks(rs, 500, .5, 1.4)[..., None])                 # pinholes
    return np.clip(base, 0, 255).astype(np.uint8)


def craze(rs, cell=26):
    """A crazing network: Voronoi cell edges, at two scales."""
    m = np.zeros((S, S), np.float32)
    for c, w in ((cell, 1.0), (cell * 3, 1.0)):
        pts = rs.uniform(0, S, (int((S / c) ** 2), 2)).astype(np.float32)
        sub = cv2.Subdiv2D((-S, -S, 3 * S, 3 * S))
        for x, y in pts:
            for dx in (-S, 0, S):
                for dy in (-S, 0, S): sub.insert((float(x + dx), float(y + dy)))
        facets, _ = sub.getVoronoiFacetList([])
        for f in facets:
            f = np.int32(f); cv2.polylines(m, [f], True, w, 1, lineType=cv2.LINE_AA)
    wob = fbm(rs, base=8)
    return np.clip(m * (.4 + .8 * wob) * 255, 0, 255).astype(np.uint8)


def wear(rs):
    """Where the slip has worn away: broad patches with ragged edges."""
    f = fbm(rs, base=3, falloff=.62)
    return (np.clip((f - .35) * 2.2, 0, 1) ** 1.2 * 255).astype(np.uint8)


def stain(rs):
    f = fbm(rs, base=2, falloff=.7); spots = cv2.GaussianBlur(specks(rs, 30, 6, 30), (0, 0), 6)
    return (np.clip((f - .45) * 2 + spots * .6, 0, 1) * 255).astype(np.uint8)


MAKERS = {"clay": clay, "slip": slip, "craze": craze, "wear": wear, "stain": stain}


def make_all(out_dir, variants=3, seed=1):
    import pathlib; out = pathlib.Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    made = []
    for kind, fn in MAKERS.items():
        for v in range(variants):
            rs = np.random.default_rng(seed * 1000 + hash(kind) % 997 + v)
            img = fn(rs)
            p = out / f"{kind}__standin{v + 1}.png"
            cv2.imwrite(str(p), cv2.cvtColor(img, cv2.COLOR_RGB2BGR) if img.ndim == 3 else img)
            made.append(p)
    return made
