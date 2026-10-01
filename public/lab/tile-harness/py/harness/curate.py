"""A local page for choosing: designs and materials side by side, click to pick.

Open out/gallery.html in a browser. Click the ones you like, press "Save picks",
and put the downloaded picks.json in the harness folder. `pack` then uses only
your picks, and `generate <kind> --breed` makes children of them.
"""
import json, pathlib, html


def build(root, out_path):
    root = pathlib.Path(root); out_path = pathlib.Path(out_path)
    rel = lambda p: pathlib.Path("..") / p.relative_to(root)
    try: pk = json.load(open(root / "picks.json"))
    except Exception: pk = {}
    cards = []
    for rep_p in sorted((root / "out/designs").glob("*/report.json")):
        rep = json.load(open(rep_p)); n = rep["name"]
        checks = "".join(f'<li class="{c["result"]}">{html.escape(c["check"])}: {html.escape(c["detail"])}</li>' for c in rep["checks"])
        cards.append(("designs", n, f'<img src="{rel(rep_p.parent / "stages.jpg")}" class="wide" loading="lazy"><b>{html.escape(n)}</b> '
                      f'<span class="{"pass" if rep["ok"] else "fail"}">{"plays" if rep["ok"] else "fails a check"}</span><ul>{checks}</ul>'))
    try: idx = json.load(open(root / "textures/maps/index.json"))
    except Exception: idx = []
    for d in idx:
        side = root / "textures/raw" / (pathlib.Path(d["source"]).stem + ".json")
        prompt = json.load(open(side)).get("prompt", "") if side.exists() else "procedural stand-in" if "standin" in d["source"] else "uploaded image"
        cards.append(("materials", d["source"], f'<img src="{rel(root / "textures/maps" / d["map"])}" loading="lazy"><b>{d["kind"]}</b><small>{html.escape(prompt[:160])}</small>'))
    body = []
    for group, title in (("designs", "Designs"), ("materials", "Materials")):
        items = [c for c in cards if c[0] == group]
        body.append(f'<h2>{title}</h2><div class="grid {group}">' + "".join(
            f'<button class="card{" on" if k in pk.get(g, []) else ""}" data-g="{g}" data-k="{html.escape(k)}">{inner}</button>' for g, k, inner in items) + "</div>")
    page = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tile harness: picks</title>
<style>
body{{background:#1d1a17;color:#e6dcc8;font:16px Georgia,serif;margin:0;padding:20px 16px 80px}} h1,h2{{font-weight:400;color:#e9dcc0;letter-spacing:.03em}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}} .grid.designs{{grid-template-columns:repeat(auto-fill,minmax(460px,1fr))}}
.card{{all:unset;cursor:pointer;background:#27231f;border:2px solid #4a4239;border-radius:4px;padding:8px;display:flex;flex-direction:column;gap:6px}}
.card.on{{border-color:#c9a03f;box-shadow:0 0 0 2px #c9a03f55}} .card img{{width:100%;aspect-ratio:1;object-fit:cover;border-radius:2px}} .card img.wide{{aspect-ratio:3/1}}
small{{color:#a39580;font-size:12.5px}} ul{{margin:0;padding-left:18px;font-size:13px}} li.pass{{color:#a9c08a}} li.warn{{color:#d9b86a}} li.fail,span.fail{{color:#e0876a}} span.pass{{color:#a9c08a}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:#15110e;border-top:1px solid #4a4239;padding:10px 16px;display:flex;gap:12px;align-items:center}}
.bar button{{font:inherit;background:#e9dcc0;color:#2e2217;border:0;border-radius:3px;padding:6px 14px;cursor:pointer}}
</style><h1>Tile harness: choose</h1><p>Click to pick. Picked designs and materials go into the next pack; picked materials are the parents for <code>generate --breed</code>.</p>
{"".join(body)}
<div class="bar"><button id="save">Save picks</button><span id="n"></span></div>
<script>
const cards=[...document.querySelectorAll('.card')], n=document.getElementById('n');
const count=()=>n.textContent=cards.filter(c=>c.classList.contains('on')).length+' picked';
cards.forEach(c=>c.onclick=()=>{{c.classList.toggle('on');count();}}); count();
document.getElementById('save').onclick=()=>{{const p={{designs:[],materials:[]}};cards.filter(c=>c.classList.contains('on')).forEach(c=>p[c.dataset.g].push(c.dataset.k));
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,1)],{{type:'application/json'}}));a.download='picks.json';a.click();}};
</script>'''
    out_path.parent.mkdir(parents=True, exist_ok=True); out_path.write_text(page)
    return out_path
