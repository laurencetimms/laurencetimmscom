#!/usr/bin/env python3
"""Tile harness: designs from plates, materials from Gemini, a texture pack for Pavement.

  python run.py all                       everything below, with stand-ins where needed
  python run.py design sources/x.jpg      clean, symmetrise, check and export one design
  python run.py standins                  procedural stand-in materials into textures/raw
  python run.py generate clay -n 6        ask Gemini for six clay surfaces
  python run.py generate clay --breed     six children of the clay images you picked
  python run.py materials                 process textures/raw into textures/maps
  python run.py gallery                   out/gallery.html: look, pick, save picks.json
  python run.py pack                      out/texpack.js for the game

See README.md for the whole loop.
"""
import argparse, json, pathlib, random, sys, time, base64
import numpy as np, cv2
from harness import design as D, validate as V, materials as M, standins as S, prompts as PR

ROOT = pathlib.Path(__file__).parent
RAW, MAPS, OUT, SRC = ROOT / "textures/raw", ROOT / "textures/maps", ROOT / "out", ROOT / "sources"
PICKS = ROOT / "picks.json"


def picks():
    try: return json.load(open(PICKS))
    except Exception: return {}


def cmd_design(a):
    path = pathlib.Path(a.image); name = a.name or path.stem
    d = OUT / "designs" / name; (d / "tiles").mkdir(parents=True, exist_ok=True)
    rgb = D.load(path)
    sq, quad = D.find_design(rgb, a.size) if not a.already_square else (cv2.resize(rgb, (a.size, a.size)), None)
    mask = D.tidy(D.classify(sq, a.colours))
    if a.group != "none": mask, shift = D.recentre(mask)
    else: shift = (0, 0)
    sym, disagree = D.symmetrise(mask, a.group)
    sym = D.smooth(sym)
    rep = V.check(sym, a.tiles, disagree=disagree if a.group != "none" else None)
    before, after = D.count_features(mask), D.count_features(sym)
    lost_ok = after >= .8 * before
    rep["checks"].insert(1, {"check": "detail kept by the vote", "result": "pass" if lost_ok else "warn",
        "detail": f"{after} separate pieces of pattern after, {before} before" + ("" if lost_ok else ": small features were drawn too unevenly to agree; redraw or use a cleaner source")})
    rep.update({"name": name, "source": str(path), "group": a.group, "tiles": a.tiles, "colours": a.colours, "recentred_by_px": shift})
    cv2.imwrite(str(d / "mask.png"), (sym * 127).astype(np.uint8))
    cv2.imwrite(str(d / "slip.png"), cv2.cvtColor(D.to_rgba(sym), cv2.COLOR_RGBA2BGRA))
    D.to_svg(sym, d / "design.svg")
    for y, row in enumerate(D.slice_tiles(sym, a.tiles)):
        for x, t in enumerate(row): cv2.imwrite(str(d / "tiles" / f"tile_{x}{y}.png"), (t * 127).astype(np.uint8))
    viz = lambda m: cv2.cvtColor(np.choose(m, [np.uint8(30), np.uint8(225), np.uint8(120)]).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    stages = np.hstack([cv2.cvtColor(sq, cv2.COLOR_RGB2BGR), viz(mask), viz(sym)])
    for k in range(1, a.tiles):                                 # mark the slices on the last panel
        p = a.size * 2 + k * a.size // a.tiles
        cv2.line(stages, (p, 0), (p, a.size), (60, 60, 200), 2); cv2.line(stages, (a.size * 2, k * a.size // a.tiles), (a.size * 3, k * a.size // a.tiles), (60, 60, 200), 2)
    cv2.imwrite(str(d / "stages.jpg"), cv2.resize(stages, (1800, 600)), [cv2.IMWRITE_JPEG_QUALITY, 85])
    json.dump(rep, open(d / "report.json", "w"), indent=1)
    flag = "PASS" if rep["ok"] else "FAIL"
    print(f"{name}: {flag}")
    for c in rep["checks"]: print(f"   {c['result']:4}  {c['check']}: {c['detail']}")
    return rep


def cmd_standins(a):
    for p in S.make_all(RAW, a.variants): print("made", p.relative_to(ROOT))


def cmd_generate(a):
    from harness import gemini
    rnd = random.Random(a.seed or time.time())
    parents = []
    if a.breed:
        for name in picks().get("materials", []):
            side = RAW / (pathlib.Path(name).stem + ".json")
            if name.startswith(a.kind + "__") and side.exists():
                meta = json.load(open(side)); parents.append((RAW / meta["file"], meta.get("slots")))
        if not parents: sys.exit(f"No picked {a.kind} images with prompts to breed from. Pick some in the gallery first.")
    for i in range(a.n):
        if parents:
            ppath, pslots = rnd.choice(parents)
            slots = PR.mutate(a.kind, pslots or PR.fresh(a.kind, rnd), rnd); refs = [ppath] + list(a.refs or [])
        else:
            slots = PR.fresh(a.kind, rnd); refs = list(a.refs or [])
        prompt = PR.render(a.kind, slots, "Match the material in the reference images." if refs else "")
        stamp = time.strftime("%Y%m%d-%H%M%S")
        out = RAW / f"{a.kind}__gem{stamp}-{rnd.getrandbits(24):06x}.png"     # unique, so children never overwrite parents
        p = gemini.generate(prompt, out, refs=refs, model=a.model, meta={"kind": a.kind, "slots": slots, "file": out.name})
        print("made", p.relative_to(ROOT), "\n   ", prompt[:110], "...")


def cmd_materials(a):
    done = M.process_all(RAW, MAPS)
    for d in done: print(f"{d['kind']:6} {d['map']}")


def b64(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def cmd_pack(a):
    pk = picks(); idx = json.load(open(MAPS / "index.json"))
    chosen = {}
    for k in M.KINDS:
        maps = [d["map"] for d in idx if d["kind"] == k]
        picked = [m for m in maps if pathlib.Path(m).stem in {pathlib.Path(p).stem for p in pk.get("materials", [])}]
        chosen[k] = (picked or maps)[: a.per_kind]
    designs = []
    for d in sorted((OUT / "designs").glob("*/report.json")):
        rep = json.load(open(d)); name = rep["name"]
        if pk.get("designs") and name not in pk["designs"]: continue
        if not rep["ok"] and not a.include_failed: print("skipping (failed checks):", name); continue
        slip = cv2.imread(str(d.parent / "slip.png"), cv2.IMREAD_UNCHANGED)
        small = cv2.resize(slip, (a.design_px, a.design_px), interpolation=cv2.INTER_AREA)
        tmp = OUT / f"_{name}.png"; cv2.imwrite(str(tmp), small); designs.append({"name": name, "img": b64(tmp, "image/png")}); tmp.unlink()
    pack = {"maps": {k: [b64(MAPS / m, "image/jpeg") for m in v] for k, v in chosen.items()}, "designs": designs,
            "made": time.strftime("%Y-%m-%d %H:%M"), "sources": {k: v for k, v in chosen.items()}}
    OUT.mkdir(exist_ok=True)
    (OUT / "texpack.js").write_text("window.TEXPACK = " + json.dumps(pack) + ";\n")
    kb = (OUT / "texpack.js").stat().st_size // 1024
    print(f"out/texpack.js: {sum(len(v) for v in chosen.values())} maps, {len(designs)} designs, {kb} KB")
    for k, v in chosen.items(): print(f"   {k:6} {', '.join(v)}")
    print("   designs", ", ".join(d["name"] for d in designs) or "(none)")


def cmd_gallery(a):
    from harness import curate
    p = curate.build(ROOT, OUT / "gallery.html"); print("open", p.relative_to(ROOT))


def cmd_all(a):
    if not any(RAW.glob("*__*")): cmd_standins(argparse.Namespace(variants=3))
    for img in sorted(SRC.glob("*.jpg")) + sorted(SRC.glob("*.png")):
        cmd_design(argparse.Namespace(image=img, name=None, group="d4", colours=2, tiles=2, size=1024, already_square=False))
    cmd_materials(a); cmd_pack(argparse.Namespace(per_kind=3, design_px=512, include_failed=False)); cmd_gallery(a)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    d = sp.add_parser("design"); d.add_argument("image"); d.add_argument("--name"); d.add_argument("--group", default="d4", choices=list(D.GROUPS))
    d.add_argument("--colours", type=int, default=2, choices=[2, 3]); d.add_argument("--tiles", type=int, default=2); d.add_argument("--size", type=int, default=1024)
    d.add_argument("--already-square", action="store_true", help="the image is already just the design, edge to edge")
    s = sp.add_parser("standins"); s.add_argument("--variants", type=int, default=3)
    g = sp.add_parser("generate"); g.add_argument("kind", choices=M.KINDS); g.add_argument("-n", type=int, default=4); g.add_argument("--refs", nargs="*")
    g.add_argument("--breed", action="store_true"); g.add_argument("--model", default=None); g.add_argument("--seed", type=int)
    sp.add_parser("materials")
    p = sp.add_parser("pack"); p.add_argument("--per-kind", type=int, default=3); p.add_argument("--design-px", type=int, default=512); p.add_argument("--include-failed", action="store_true")
    sp.add_parser("gallery"); sp.add_parser("all")
    a = ap.parse_args()
    if a.cmd == "generate" and a.model is None:
        from harness.gemini import DEFAULT_MODEL; a.model = DEFAULT_MODEL
    {"design": cmd_design, "standins": cmd_standins, "generate": cmd_generate, "materials": cmd_materials,
     "pack": cmd_pack, "gallery": cmd_gallery, "all": cmd_all}[a.cmd](a)


if __name__ == "__main__":
    main()
