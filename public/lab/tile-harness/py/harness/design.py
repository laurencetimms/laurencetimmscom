"""The design pipeline: a picture of a tile design in, a clean, exact, sliceable mask out.

    source image -> find the design -> square it up -> two (or three) colours
                 -> remove specks and grout lines -> enforce symmetry -> slice

The mask is the truth the game plays on: 0 = body (red clay), 1 = slip (cream),
2 = green (optional third colour). Everything else is decoration added later.
"""
import math, numpy as np, cv2

BODY, SLIP, GREEN = 0, 1, 2


# ---------------------------------------------------------------- loading and squaring

def load(path):
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if im is None: raise FileNotFoundError(path)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


def find_design(rgb, size=1024):
    """Find the tile design on a page (a plate, a photo) and warp it to a square.

    Clay is redder than paper or background, so the design is the largest red
    region. Its outline is fitted with four straight sides (ignoring corners
    that the pattern may cut away), and the four corners where those sides meet
    are warped flat. Returns the square image and the corners used.
    """
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    a = cv2.GaussianBlur(lab[..., 1], (0, 0), 2)
    _, m = cv2.threshold(a, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    k = max(5, int(min(rgb.shape[:2]) * .012) | 1)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))           # drop captions and rules
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k * 6 + 1, k * 6 + 1), np.uint8))   # bridge the slip pattern
    n, lab_, stats, _ = cv2.connectedComponentsWithStats(m)
    if n < 2: raise ValueError("no design found")
    blob = (lab_ == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    cnts, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(cnts, key=cv2.contourArea)).reshape(-1, 2).astype(np.float32)
    box = order_corners(np.float32(cv2.boxPoints(cv2.minAreaRect(hull))))
    # refine each side: fit a line to hull points lying close to that side of the box, away from its corners
    dense = np.concatenate([np.linspace(hull[i], hull[(i + 1) % len(hull)], 40) for i in range(len(hull))])
    lines = []
    side = np.linalg.norm(box[1] - box[0])
    for i in range(4):
        p, q = box[i], box[(i + 1) % 4]; d = (q - p) / np.linalg.norm(q - p); nrm = np.array([-d[1], d[0]])
        t = (dense - p) @ d; off = np.abs((dense - p) @ nrm)
        sel = dense[(off < side * .04) & (t > side * .25) & (t < np.linalg.norm(q - p) - side * .25)]
        if len(sel) < 10: lines.append((p, d)); continue
        vx, vy, x0, y0 = cv2.fitLine(sel, cv2.DIST_HUBER, 0, .01, .01).ravel()
        lines.append((np.array([x0, y0]), np.array([vx, vy])))
    def meet(l1, l2):
        (p1, d1), (p2, d2) = l1, l2
        A = np.array([d1, -d2]).T
        try: t = np.linalg.solve(A, p2 - p1); return p1 + t[0] * d1
        except np.linalg.LinAlgError: return p1
    quad = np.float32([meet(lines[(i - 1) % 4], lines[i]) for i in range(4)])
    quad = order_corners(quad)
    dst = np.float32([[0, 0], [size, 0], [size, size], [0, size]])
    sq = cv2.warpPerspective(rgb, cv2.getPerspectiveTransform(quad, dst), (size, size), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return sq, quad


def order_corners(p):
    s, d = p.sum(1), np.diff(p, axis=1).ravel()
    return np.float32([p[np.argmin(s)], p[np.argmin(d)], p[np.argmax(s)], p[np.argmax(d)]])


# ---------------------------------------------------------------- colours

def classify(sq, colours=2):
    """Split the squared image into body / slip (/ green) by clustering in Lab.

    The lightest cluster is slip; with three colours the greenest is green.
    """
    lab = cv2.cvtColor(cv2.GaussianBlur(sq, (0, 0), 1.2), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .2)
    _, lbl, cen = cv2.kmeans(lab, colours, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    lbl = lbl.reshape(sq.shape[:2])
    out = np.zeros(sq.shape[:2], np.uint8)
    slip = int(np.argmax(cen[:, 0]))
    out[lbl == slip] = SLIP
    if colours == 3:
        rest = [i for i in range(3) if i != slip]
        green = min(rest, key=lambda i: cen[i, 1])            # lowest a* = greenest
        out[lbl == green] = GREEN
    return out


def tidy(mask, min_area=0.00006, close=0.012):
    """Remove specks, holes and thin grout lines. Sizes are fractions of the image."""
    n = mask.shape[0]; out = mask.copy()
    k = max(3, int(n * close) | 1)
    for v in np.unique(mask):
        if v == BODY: continue
        m = (mask == v).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))   # heal grout cuts
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        out[(out == v) & (m == 0)] = BODY; out[m == 1] = v
    # drop tiny islands of either colour
    amin = int(min_area * n * n)
    for v in np.unique(out):
        m = (out == v).astype(np.uint8)
        cnt, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=4)
        for i in range(1, cnt):
            if st[i, cv2.CC_STAT_AREA] < amin:
                ys, xs = np.where(lab == i)
                ring = cv2.dilate((lab == i).astype(np.uint8), np.ones((3, 3), np.uint8)) & (1 - m)
                vals = out[ring == 1]
                out[ys, xs] = np.bincount(vals).argmax() if len(vals) else BODY
    return out


# ---------------------------------------------------------------- symmetry

def recentre(mask, max_shift=0.04):
    """Nudge the design so its centre of symmetry sits at the image centre.

    A design with 2-fold (or 4-fold) symmetry matches itself turned half round
    about its true centre. Phase correlation proposes the offset; the sign and
    size are confirmed by measuring how well the half turn agrees afterwards.
    """
    f = (mask > 0).astype(np.float32)
    (dx, dy), _ = cv2.phaseCorrelate(f, np.rot90(f, 2).copy())
    lim = max_shift * mask.shape[0]
    def shifted(sx, sy):
        M = np.float32([[1, 0, sx], [0, 1, sy]])
        return cv2.warpAffine(mask, M, mask.shape[::-1], flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT)
    def agree(m): return float((m == np.rot90(m, 2)).mean())
    best = (agree(mask), 0.0, 0.0)
    for sx, sy in [(dx / 2, dy / 2), (-dx / 2, -dy / 2), (dx / 2, -dy / 2), (-dx / 2, dy / 2)]:
        if abs(sx) > lim or abs(sy) > lim: continue
        sc = agree(shifted(sx, sy))
        if sc > best[0]: best = (sc, sx, sy)
    _, sx, sy = best
    return (shifted(sx, sy) if (sx or sy) else mask), (float(sx), float(sy))


GROUPS = {
    # name: the transforms whose results are averaged
    "d4": [lambda a: a, lambda a: np.rot90(a, 1), lambda a: np.rot90(a, 2), lambda a: np.rot90(a, 3),
           lambda a: a[:, ::-1], lambda a: a[::-1, :], lambda a: a.T, lambda a: np.rot90(a, 2).T],
    "c4": [lambda a: a, lambda a: np.rot90(a, 1), lambda a: np.rot90(a, 2), lambda a: np.rot90(a, 3)],
    "d2": [lambda a: a, lambda a: a[:, ::-1], lambda a: a[::-1, :], lambda a: np.rot90(a, 2)],
    "mirror": [lambda a: a, lambda a: a[:, ::-1]],
    "none": [lambda a: a],
}


def symmetrise(mask, group="d4", soft=0.005):
    """Make the design exactly symmetric by a vote across its symmetry group.

    Every pixel takes the majority value of its symmetric partners, so a
    flaw in one quarter (a missed pellet, a heavier line) is outvoted by the
    other quarters. Each copy is softened slightly first, so small features
    that a hand-drawn source put a few pixels out of place still overlap and
    survive the vote. Returns the new mask and how much each partner
    disagreed with the result (a measure of how asymmetric the source was).
    """
    ts = GROUPS[group]; vals = np.unique(mask); s = soft * mask.shape[0]
    blur = (lambda a: cv2.GaussianBlur(a, (0, 0), s)) if s > 0 else (lambda a: a)
    votes = np.stack([np.stack([t(blur((mask == v).astype(np.float32))) for t in ts]).mean(0) for v in vals])
    out = vals[np.argmax(votes, 0)].astype(np.uint8)
    disagree = [float((t(mask) != out).mean()) for t in ts]
    return out, disagree


def count_features(mask):
    """Separate pieces of pattern (slip and green), for spotting detail lost in the vote."""
    return sum(cv2.connectedComponents((mask == v).astype(np.uint8), connectivity=8)[0] - 1 for v in np.unique(mask) if v != BODY)


def smooth(mask, sigma=0.004):
    """Round off jaggies left by the scan and the vote, keeping shapes where they are."""
    vals = np.unique(mask); s = sigma * mask.shape[0]
    soft = np.stack([cv2.GaussianBlur((mask == v).astype(np.float32), (0, 0), s) for v in vals])
    return vals[np.argmax(soft, 0)].astype(np.uint8)


# ---------------------------------------------------------------- slicing and export

def slice_tiles(mask, n=2):
    s = mask.shape[0] // n
    return [[mask[y * s:(y + 1) * s, x * s:(x + 1) * s] for x in range(n)] for y in range(n)]


def to_rgba(mask, slip=(236, 210, 154), green=(85, 119, 58)):
    """The slip (and green) as colour on transparency: the game paints the body itself."""
    out = np.zeros(mask.shape + (4,), np.uint8)
    out[mask == SLIP] = slip + (255,); out[mask == GREEN] = green + (255,)
    a = cv2.GaussianBlur(out[..., 3].astype(np.float32), (0, 0), .7)                      # soft edge
    out[..., 3] = np.clip(a, 0, 255).astype(np.uint8)
    return out


def to_svg(mask, path, colours={SLIP: "#ecd29a", GREEN: "#55773a"}, body="#8f3a1e", eps=0.0012):
    """Trace the mask into SVG paths (even-odd fill keeps the holes)."""
    n = mask.shape[0]; parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}"><rect width="{n}" height="{n}" fill="{body}"/>']
    for v, col in colours.items():
        m = (mask == v).astype(np.uint8)
        if not m.any(): continue
        cnts, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        d = []
        for c in cnts:
            c = cv2.approxPolyDP(c, eps * n, True).reshape(-1, 2)
            if len(c) < 3: continue
            d.append("M" + " L".join(f"{x},{y}" for x, y in c) + "Z")
        parts.append(f'<path fill="{col}" fill-rule="evenodd" d="{" ".join(d)}"/>')
    parts.append("</svg>")
    open(path, "w").write("".join(parts))
