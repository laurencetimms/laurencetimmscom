"""Make stand-in 'antiquarian plates' to test the design pipeline.

The real inputs are scans of plates such as Nichols, *Examples of Decorative Tiles*
(1845) or Shaw, *Specimens of Tile Pavements* (1858), or photographs of real tiles.
These stand-ins imitate their faults on purpose: hand-drawn wobble, a skewed scan,
yellowed paper, a caption, print grain, grout lines, and one quarter drawn a little
differently from the others. The pipeline should remove all of that.
"""
import sys, math, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

N = 2048                      # the 2x2 block, drawn at this size
BODY, SLIP = (128, 52, 30), (232, 205, 140)

def poly(d, pts, fill): d.polygon([(float(x), float(y)) for x, y in pts], fill=fill)
def disc(d, x, y, r, fill): d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
def ring(d, x, y, r1, r2):
    disc(d, x, y, r1, SLIP); disc(d, x, y, r2, BODY)

def fleur(d, cx, cy, ang, s, fill):
    """A fleur-de-lis pointing along ang from (cx, cy)."""
    ca, sa = math.cos(ang), math.sin(ang)
    T = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    petal = [T(s * (0.0 + 0.9 * t), s * 0.16 * math.sin(math.pi * t)) for t in np.linspace(0, 1, 20)]
    petal += [T(s * (0.9 - 0.9 * t), -s * 0.16 * math.sin(math.pi * (1 - t))) for t in np.linspace(0, 1, 20)]
    poly(d, petal, fill)
    for side in (-1, 1):
        arm = [T(s * (0.3 + 0.5 * math.sin(t * 1.4)) , side * s * (0.05 + 0.45 * math.sin(t * 1.9) ** 2)) for t in np.linspace(0, 1.6, 26)]
        arm += [T(s * (0.25 + 0.2 * (1 - t)), side * s * 0.08 * t) for t in np.linspace(0, 1, 8)]
        poly(d, arm, fill)
    poly(d, [T(s * 0.22, -s * 0.3), T(s * 0.32, -s * 0.3), T(s * 0.32, s * 0.3), T(s * 0.22, s * 0.3)], fill)

def design_rose(d, c, flaw):
    """Roundel: cusped outer band, fleurs on the diagonals, an eight-petalled rose."""
    R = N / 2
    ring(d, c, c, R * .95, R * .86)
    for k in range(16):                                   # cusps on the inside of the band
        a = (k + .5) * math.pi / 8; disc(d, c + math.cos(a) * R * .86, c + math.sin(a) * R * .86, R * .06, SLIP)
    for k in range(16): a = (k + .5) * math.pi / 8; disc(d, c + math.cos(a) * R * .86, c + math.sin(a) * R * .86, R * .028, BODY)
    for k in range(4):                                    # fleurs on the diagonals, pointing outwards
        a = math.pi / 4 + k * math.pi / 2; fleur(d, c + math.cos(a) * R * .3, c + math.sin(a) * R * .3, a, R * .42, SLIP)
    for k in range(4):                                    # pellets between fleurs
        if flaw and k == 1: continue                      # the antiquarian missed one
        a = k * math.pi / 2; disc(d, c + math.cos(a) * R * .6, c + math.sin(a) * R * .6, R * .07, SLIP)
    for k in range(8):                                    # the rose
        a = k * math.pi / 4; disc(d, c + math.cos(a) * R * .13, c + math.sin(a) * R * .13, R * .085, SLIP)
    disc(d, c, c, R * .08, BODY); disc(d, c, c, R * .04, SLIP)
    for (x, y) in ((0, 0), (N, 0), (0, N), (N, N)):       # quarter-roses in the corners, to meet the neighbours
        disc(d, x, y, R * .2, SLIP); disc(d, x, y, R * .13, BODY); disc(d, x, y, R * .07, SLIP)

def design_star(d, c, flaw):
    """Roundel: a double ring, an eight-pointed star of interlaced squares, leaves in the spandrels."""
    R = N / 2
    ring(d, c, c, R * .96, R * .9); ring(d, c, c, R * .8, R * .74)
    for k in range(32): a = k * math.pi / 16; disc(d, c + math.cos(a) * R * .85, c + math.sin(a) * R * .85, R * .022, SLIP)
    for rot in (0, math.pi / 4):
        pts = [(c + math.cos(rot + k * math.pi / 2) * R * .66, c + math.sin(rot + k * math.pi / 2) * R * .66) for k in range(4)]
        poly(d, pts, SLIP)
    for rot in (0, math.pi / 4):
        pts = [(c + math.cos(rot + k * math.pi / 2) * R * .56, c + math.sin(rot + k * math.pi / 2) * R * .56) for k in range(4)]
        poly(d, pts, BODY)
    ring(d, c, c, R * .3, R * .22)
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8; r = R * (.075 if not (flaw and k == 3) else .05)
        disc(d, c + math.cos(a) * R * .43, c + math.sin(a) * R * .43, r, SLIP)
    disc(d, c, c, R * .1, SLIP); disc(d, c, c, R * .05, BODY)
    for (x, y, a0) in ((0, 0, 0), (N, 0, math.pi / 2), (N, N, math.pi), (0, N, 3 * math.pi / 2)):
        for j in (-1, 0, 1):                              # a spray of three leaves in each corner
            a = a0 + math.pi / 4 + j * .42
            pts = [(x + math.cos(a) * t * R * .36 - math.sin(a) * R * .07 * math.sin(math.pi * t), y + math.sin(a) * t * R * .36 + math.cos(a) * R * .07 * math.sin(math.pi * t)) for t in np.linspace(0, 1, 18)]
            pts += [(x + math.cos(a) * t * R * .36 + math.sin(a) * R * .07 * math.sin(math.pi * t), y + math.sin(a) * t * R * .36 - math.cos(a) * R * .07 * math.sin(math.pi * t)) for t in np.linspace(1, 0, 18)]
            poly(d, pts, SLIP)

def make(name, fn, seed):
    rs = np.random.default_rng(seed)
    im = Image.new("RGB", (N, N), BODY); d = ImageDraw.Draw(im); fn(d, N / 2, True)
    a = np.asarray(im).copy()
    # hand-drawn wobble: a smooth displacement field
    fx = cv2.GaussianBlur(rs.normal(0, 1, (N, N)).astype(np.float32), (0, 0), 60); fy = cv2.GaussianBlur(rs.normal(0, 1, (N, N)).astype(np.float32), (0, 0), 60)
    fx *= 7 / fx.std(); fy *= 7 / fy.std()
    gx, gy = np.meshgrid(np.arange(N, dtype=np.float32), np.arange(N, dtype=np.float32))
    a = cv2.remap(a, gx + fx, gy + fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    # grout lines between the four tiles
    a[N // 2 - 4:N // 2 + 4, :] = (70, 40, 28); a[:, N // 2 - 4:N // 2 + 4] = (70, 40, 28)
    # print grain
    a = np.clip(a.astype(np.float32) * (1 + rs.normal(0, .06, (N, N, 1))), 0, 255).astype(np.uint8)
    # put it on a page with a margin and a caption
    M = 380; page = np.full((N + 2 * M + 200, N + 2 * M, 3), (226, 214, 184), np.uint8)
    page = np.clip(page.astype(np.float32) * (1 + cv2.GaussianBlur(rs.normal(0, .08, page.shape[:2]).astype(np.float32), (0, 0), 25)[..., None] * 3), 0, 255).astype(np.uint8)
    page[M:M + N, M:M + N] = a
    cv2.rectangle(page, (M - 40, M - 40), (M + N + 40, M + N + 40), (60, 45, 35), 6)
    pim = Image.fromarray(page); pd = ImageDraw.Draw(pim)
    try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf", 64)
    except Exception: font = ImageFont.load_default()
    pd.text((M, M + N + 90), f"Fig. {seed}.  Four tiles forming a roundel. ({name}, stand-in plate)", fill=(60, 45, 35), font=font)
    page = np.asarray(pim)
    # a skewed, slightly rotated scan
    h, w = page.shape[:2]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]]); j = lambda: rs.uniform(-30, 30)
    dst = np.float32([[60 + j(), 40 + j()], [w - 20 + j(), 90 + j()], [w - 70 + j(), h - 30 + j()], [30 + j(), h - 60 + j()]])
    page = cv2.warpPerspective(page, cv2.getPerspectiveTransform(src, dst), (w, h), borderValue=(200, 190, 165))
    page = cv2.resize(page, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f"{name}.jpg", cv2.cvtColor(page, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 72])

if __name__ == "__main__":
    make("plate_rose", design_rose, 3)
    make("plate_star", design_star, 7)
    print("made plate_rose.jpg, plate_star.jpg")
