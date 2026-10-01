"""Checks that a design will play, before any decoration is spent on it.

These use the same seam reading as the game: each tile shrunk to 40x40, its
outer rows and columns read as body / slip / green, compared with a little
tolerance. A design fails if a wrongly turned tile could look right, if a seam
carries too little pattern to read, if detail vanishes at phone size, or if
slivers of pattern sit on an edge where they would mislead.
"""
import numpy as np, cv2
from .design import slice_tiles

FS = 40


def small(tile):
    """Shrink a mask to the game's 40x40 reading, keeping the commonest class per cell."""
    vals = np.unique(tile); best = None
    for v in vals:
        f = cv2.resize((tile == v).astype(np.float32), (FS, FS), interpolation=cv2.INTER_AREA)
        best = (f, np.full((FS, FS), v, np.uint8)) if best is None else (np.maximum(best[0], f), np.where(f > best[0], v, best[1]))
    return best[1]


def edges(tile, rot=0):
    """Top, right, bottom, left edges, read clockwise like the game."""
    s = np.rot90(small(tile), -rot)
    return [s[0, :], s[:, -1], s[-1, :], s[:, 0]]


def fuzzy(a, b):
    """Mismatches that are not explained by a one-cell shift (the game's rule)."""
    n = 0
    for i in range(len(a)):
        if a[i] != b[i] and (i == 0 or a[i] != b[i - 1]) and (i == len(a) - 1 or a[i] != b[i + 1]): n += 1
    return n


def check(mask, n=2, tol=2, disagree=None):
    tiles = slice_tiles(mask, n); rep = {"checks": [], "ok": True}

    def add(name, ok, detail, warn_only=False):
        rep["checks"].append({"check": name, "result": "pass" if ok else ("warn" if warn_only else "fail"), "detail": detail})
        if not ok and not warn_only: rep["ok"] = False

    # 1. did the source really have this symmetry?
    if disagree is not None:
        worst = max(disagree)
        add("source symmetry", worst < .08, f"worst quarter differed from the vote by {worst:.1%}", warn_only=True)

    # 2. every seam inside the block must carry readable pattern
    weak = []
    for y in range(n):
        for x in range(n):
            e = edges(tiles[y][x])
            for d, (dx, dy) in enumerate([(0, -1), (1, 0), (0, 1), (-1, 0)]):
                if 0 <= x + dx < n and 0 <= y + dy < n:
                    changes = int((np.diff(e[d].astype(int)) != 0).sum())
                    if changes < 4: weak.append(f"tile {x},{y} side {'NESW'[d]}: {changes} changes")
    add("seams carry pattern", not weak, "all inner seams cross the pattern at least twice" if not weak else "; ".join(weak))

    # 3. a wrongly turned tile must not fit its neighbours
    fooled = []
    for y in range(n):
        for x in range(n):
            home = [edges(tiles[y][x], 0)]
            for r in (1, 2, 3):
                er = edges(tiles[y][x], r); fits = True
                for d, (dx, dy) in enumerate([(0, -1), (1, 0), (0, 1), (-1, 0)]):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < n and 0 <= ny < n:
                        nb = edges(tiles[ny][nx])[(d + 2) % 4]
                        if fuzzy(er[d], nb) > tol: fits = False
                    else:                                       # an outer side must look as it does at home
                        if fuzzy(er[d], home[0][d]) > tol: fits = False
                if fits and fuzzy(np.concatenate(er), np.concatenate(home[0])) > tol:
                    fooled.append(f"tile {x},{y} turned {r * 90}°")
    add("turns are unambiguous", not fooled, "no wrong turn fits" if not fooled else "; ".join(fooled))

    # 4. readable at phone size (a tile about 48 px across)
    worst_iou = 1.0
    for row in tiles:
        for t in row:
            s = t.shape[0]
            back = cv2.resize(cv2.resize(t, (48, 48), interpolation=cv2.INTER_AREA), (s, s), interpolation=cv2.INTER_NEAREST)
            inter = ((back > 0) & (t > 0)).sum(); uni = ((back > 0) | (t > 0)).sum()
            worst_iou = min(worst_iou, inter / max(uni, 1))
    add("readable small", worst_iou > .85, f"worst tile keeps {worst_iou:.0%} of its pattern at 48 px")

    # 5. hairlines: slip narrower than about 1% of a tile disappears or shimmers
    s = tiles[0][0].shape[0]
    dist = cv2.distanceTransform((mask > 0).astype(np.uint8), cv2.DIST_L2, 3)
    skel_thin = ((dist > 0) & (dist < s * .006)).sum() / max((mask > 0).sum(), 1)
    add("no hairlines", skel_thin < .12, f"{skel_thin:.0%} of the pattern is hairline-thin", warn_only=True)

    # 6. slivers at the edges: tiny bits of pattern cut off by a seam
    slivers = 0
    for row in tiles:
        for t in row:
            m = (t > 0).astype(np.uint8)
            cnt, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=4)
            for i in range(1, cnt):
                x0, y0, w, h, a = st[i]
                touches = x0 == 0 or y0 == 0 or x0 + w == t.shape[1] or y0 + h == t.shape[0]
                if touches and a < .0015 * t.size: slivers += 1
    add("no slivers", slivers == 0, f"{slivers} tiny fragments cut off at a seam", warn_only=True)

    rep["coverage"] = float((mask > 0).mean())
    add("balance of slip and clay", .2 < rep["coverage"] < .65, f"{rep['coverage']:.0%} of the surface is slip", warn_only=True)
    return rep
