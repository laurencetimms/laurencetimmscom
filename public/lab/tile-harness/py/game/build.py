"""Build a Pavement page that uses the harness's texture pack.

  python game/build.py            ->  out/pavement-workshop.html

Takes the daily game (game/pavement_base.html), adds the material compositor
and the pack, and teaches the engine two things: draw each tile through the
compositor, and draw roundels from the harness's plate designs.
"""
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
s = (ROOT / "game/pavement_base.html").read_text()

def rep(old, new, count=1):
    global s
    if old not in s: sys.exit("build: could not find " + old[:70])
    s = s.replace(old, new, count)

# 1. tiles go through the compositor when materials are on
rep("function renderTile(t) {\n  t.sharp = renderClean(t, T, true);",
    "function renderTile(t) {\n  if (window.MATERIAL && MATERIAL.on) { const m = MATERIAL.compose(renderClean(t, T, false), T, t.seed); t.sharp = m.sharp; t.worn = m.worn; t.glazeImg = m.glaze; return; }\n  t.sharp = renderClean(t, T, true);")
# 2. roundels drawn from the plates
rep("function drawBlock(c, b) {\n  const cx = b.x0 + 1, cy = b.y0 + 1;",
    "function drawBlock(c, b) {\n  const cx = b.x0 + 1, cy = b.y0 + 1;\n  if (L.style === \"plate\") { const ds = window.MATERIAL ? MATERIAL.designs : []; if (ds.length) { const im = ds[L.plate % ds.length], m = .5;\n    // the plate's edge motifs (corner roses, a ring touching the edge) are completed in the neighbouring tiles, as a real pavement does\n    c.save(); c.beginPath(); c.rect(b.x0 - m, b.y0 - m, 2 + 2 * m, 2 + 2 * m); c.rect(b.x0, b.y0, 2, 2); c.clip(\"evenodd\");\n    for (const dx of [-2, 0, 2]) for (const dy of [-2, 0, 2]) if (dx || dy) c.drawImage(im, b.x0 + dx, b.y0 + dy, 2, 2);\n    c.restore(); c.drawImage(im, b.x0, b.y0, 2, 2); return; } }")
# 3. the day may choose plates, and the workshop can insist
rep('const r = mul32(seed ^ 0x9E3779B9), v = Math.floor(r() * 3), sh = SHAPES[key], style = v === 2 ? "green" : "roundel", counter = v === 1;',
    'const nPlates = window.MATERIAL ? MATERIAL.designs.length : 0, r = mul32(seed ^ 0x9E3779B9), v = Math.floor(r() * (nPlates ? 4 : 3)), sh = SHAPES[key];\n  let style = v === 2 ? "green" : v === 3 ? "plate" : "roundel", counter = v === 1 || (v === 3 && r() < .5);\n  if (window.STYLE_OVERRIDE) { style = window.STYLE_OVERRIDE.style; counter = !!window.STYLE_OVERRIDE.counter; }\n  const plate = Math.floor(r() * Math.max(1, nPlates));                       // one design for the whole floor, so neighbouring roundels meet')
rep("return { ...sh, key, style, counter, note,", "return { ...sh, key, style, counter, note, plate,")
rep('const kinds = { roundel: counter ? "counterchanged roundels" : "roundels", green: "green-glazed foliage" }[style];',
    'const kinds = { roundel: counter ? "counterchanged roundels" : "roundels", green: "green-glazed foliage", plate: counter ? "counterchanged roundels after the old plates" : "roundels after the old plates" }[style];')
# 4. wait for the pack before laying the floor; a workshop strip for comparing
rep("document.addEventListener(\"visibilitychange\", () => { if (!document.hidden && dayIndex(today()) !== DI) load(); });\nload();",
    """document.addEventListener("visibilitychange", () => { if (!document.hidden && dayIndex(today()) !== DI) load(); });
document.querySelectorAll("[data-surface]").forEach(b => b.onclick = () => { MATERIAL.on = b.dataset.surface === "clay"; document.querySelectorAll("[data-surface]").forEach(x => x.setAttribute("aria-pressed", x === b)); window.PAVE.resize(); });
document.querySelectorAll("[data-pattern]").forEach(b => b.onclick = () => { const p = b.dataset.pattern; window.STYLE_OVERRIDE = p === "day" ? null : { style: p.split("-")[0], counter: p.endsWith("-cc") };
  document.querySelectorAll("[data-pattern]").forEach(x => x.setAttribute("aria-pressed", x === b)); load(); });
(window.MATERIAL ? MATERIAL.ready : Promise.resolve()).then(load);""")
rep('<details class="how">', '''<div class="workshop" role="group" aria-label="Workshop">
    <span>Surface</span><button data-surface="drawn" aria-pressed="false">Drawn</button><button data-surface="clay" aria-pressed="true">Fired clay</button>
    <span>Roundels</span><button data-pattern="day" aria-pressed="true">As the day has them</button><button data-pattern="plate" aria-pressed="false">From the plates</button><button data-pattern="plate-cc" aria-pressed="false">Plates, counterchanged</button>
  </div>
  <details class="how">''')
rep("[hidden]{display:none!important}", """[hidden]{display:none!important}
.workshop{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;font-size:14px}
.workshop span{font-family:var(--sc);color:var(--muted);letter-spacing:.05em;margin:0 4px 0 10px}
.workshop button[aria-pressed="true"]{background:var(--vellum);color:var(--ink);border-color:var(--vellum)}""")
rep("<title>Pavement</title>", "<title>Pavement Workshop</title>")
rep('<h1>Pavement</h1>', '<h1>Pavement</h1>\n    <p class="dateline" style="font-style:italic;text-transform:none">Workshop: the tile harness\'s materials and designs</p>')
# keep the workshop's saved games apart from the real game's
rep('localStorage.getItem("pavement." + k)', 'localStorage.getItem("pavement-ws." + k)')
rep('localStorage.setItem("pavement." + k,', 'localStorage.setItem("pavement-ws." + k,')
rep('localStorage.removeItem("pavement." + k)', 'localStorage.removeItem("pavement-ws." + k)')

pack = (ROOT / "out/texpack.js").read_text()
mat = (ROOT / "game/material.js").read_text()
engine_at = s.index("<script>\n(() => {\nconst $ = id => document.getElementById(id);\nconst cv")
s = s[:engine_at] + "<script>\n" + pack + "</script>\n" + mat + s[engine_at:]
out = ROOT / "out/pavement-workshop.html"; out.write_text(s)
print("built", out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")
