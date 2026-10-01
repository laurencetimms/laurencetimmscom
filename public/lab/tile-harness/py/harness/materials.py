"""Turn raw material images (generated, photographed or procedural) into game-ready maps.

Raw images live in textures/raw/ and are named by kind: clay__*.png, slip__*.png,
craze__*.png, wear__*.png, stain__*.png. Each kind is processed differently:

  clay, slip   colour maps: lighting flattened, cropped square, colour pulled
               towards the game's palette so every tile still reads as the
               same clay and the same slip
  craze        a line map: the dark crack network pulled out as white on black
  wear, stain  greyscale maps, normalised to the full range
"""
import pathlib, json, numpy as np, cv2

SIZE = 512
TARGET = {"clay": (143, 58, 30), "slip": (236, 210, 154)}
KINDS = ("clay", "slip", "craze", "wear", "stain")


def square(img):
    h, w = img.shape[:2]; s = min(h, w)
    return img[(h - s) // 2:(h - s) // 2 + s, (w - s) // 2:(w - s) // 2 + s]


def flatten(rgb, sigma=.12):
    """Remove uneven lighting: divide by a heavy blur, keep the fine detail."""
    f = rgb.astype(np.float32) + 1
    low = cv2.GaussianBlur(f, (0, 0), sigma * f.shape[0])
    return np.clip(f / low * low.mean((0, 1)), 0, 255)


def palette_lock(rgb, target, strength=.85, spread=1.0):
    """Shift the image's mean colour (in Lab) towards the target, keep its variation."""
    lab = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    tl = cv2.cvtColor(np.uint8([[target]]), cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]
    mean = lab.reshape(-1, 3).mean(0)
    lab = (lab - mean) * spread + mean + (tl - mean) * strength
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)


def line_map(rgb):
    """Pull dark thin lines (crazing, cracks) out as white on black."""
    g = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY) if rgb.ndim == 3 else rgb
    if g.mean() < 100 and (g > 128).mean() < .25: return g                       # already white lines on black
    bh = cv2.morphologyEx(g, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    return cv2.normalize(bh, None, 0, 255, cv2.NORM_MINMAX)


def process_one(path, out_dir):
    kind = path.name.split("__")[0]
    if kind not in KINDS: return None
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None: return None
    if img.ndim == 3 and img.shape[2] == 4: img = img[..., :3]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) if img.ndim == 3 else img
    rgb = cv2.resize(square(rgb), (SIZE, SIZE), interpolation=cv2.INTER_AREA)
    if kind in ("clay", "slip"):
        if rgb.ndim == 2: rgb = cv2.cvtColor(rgb, cv2.COLOR_GRAY2RGB)
        out = palette_lock(flatten(rgb), TARGET[kind])
    elif kind == "craze":
        out = line_map(rgb)
    else:
        g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY) if rgb.ndim == 3 else rgb
        out = cv2.normalize(g, None, 0, 255, cv2.NORM_MINMAX)
    p = pathlib.Path(out_dir) / (path.stem + ".jpg")
    cv2.imwrite(str(p), cv2.cvtColor(out, cv2.COLOR_RGB2BGR) if out.ndim == 3 else out, [cv2.IMWRITE_JPEG_QUALITY, 86])
    return {"kind": kind, "map": p.name, "source": path.name}


def process_all(raw_dir, out_dir):
    out = pathlib.Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    done = [r for p in sorted(pathlib.Path(raw_dir).glob("*")) if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") for r in [process_one(p, out)] if r]
    json.dump(done, open(out / "index.json", "w"), indent=1)
    return done
