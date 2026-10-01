// Runs the Python tile harness in the browser, in a worker so the page stays responsive.
// Pyodide supplies Python, numpy, OpenCV and Pillow; the harness itself runs unmodified
// from ./py/, copied into an in-memory folder (/h) that behaves like the harness folder
// on disk. The only substitution is harness/gemini.py, whose SDK can't run here: a
// stand-in with the same generate() calls the Gemini REST API directly.

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";
importScripts(PYODIDE + "pyodide.js");

// Everything the harness needs, relative to ./py/. Add new files here.
const FILES = [
  "README.md", "run.py",
  "harness/__init__.py", "harness/curate.py", "harness/design.py", "harness/gemini.py",
  "harness/materials.py", "harness/prompts.py", "harness/standins.py", "harness/validate.py",
  "game/build.py", "game/material.js",
  "sources/make_standin_plate.py", "sources/plate_rose.jpg", "sources/plate_star.jpg",
];
// The game the workshop is built from is the one served at /lab/pavement/, so there's one copy of it.
const EXTRA = { "game/pavement_base.html": "../pavement/index.html" };

const SETUP = String.raw`
import os, sys, io, json, time, types, base64, pathlib, zipfile, traceback, shutil
ROOT = pathlib.Path("/h"); os.chdir(ROOT); sys.path.insert(0, str(ROOT))

def _gemini_module():
    """harness/gemini.py, rewritten for the browser: same generate(), REST instead of the SDK."""
    from js import XMLHttpRequest
    m = types.ModuleType("harness.gemini")
    m.DEFAULT_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")
    def generate(prompt, out_path, refs=(), model=m.DEFAULT_MODEL, size="1K", aspect="1:1", meta=None):
        key = os.environ.get("GEMINI_API_KEY")
        if not key: raise SystemExit("Add a Gemini API key on the page first.")
        parts = [{"text": prompt}]
        for r in refs:
            mime = {".png": "image/png", ".webp": "image/webp"}.get(pathlib.Path(r).suffix.lower(), "image/jpeg")
            parts.append({"inlineData": {"mimeType": mime, "data": base64.b64encode(open(r, "rb").read()).decode()}})
        body = {"contents": [{"parts": parts}],
                "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect, "imageSize": size}}}
        x = XMLHttpRequest.new()
        x.open("POST", f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", False)
        x.setRequestHeader("Content-Type", "application/json"); x.setRequestHeader("x-goog-api-key", key)
        x.send(json.dumps(body))
        if x.status != 200: raise RuntimeError(f"Gemini said {x.status}: {x.responseText[:400]}")
        resp = json.loads(x.responseText)
        got = resp.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for part in got:
            d = part.get("inlineData") or part.get("inline_data")
            if d and d.get("data"):
                out = pathlib.Path(out_path); out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(base64.b64decode(d["data"]))
                json.dump({"prompt": prompt, "model": model, "refs": [str(r) for r in refs], "size": size,
                           "made": time.strftime("%Y-%m-%d %H:%M:%S"), "source": "Gemini (SynthID watermarked)", **(meta or {})},
                          open(out.with_suffix(".json"), "w"), indent=1)
                return out
        raise RuntimeError("No image came back. Text reply: " + " ".join(p.get("text", "") for p in got))
    m.generate = generate
    return m

def _prepare():
    import harness
    g = _gemini_module(); sys.modules["harness.gemini"] = g; harness.gemini = g
    import run
    return run

def _call(fn):
    try: fn(); return True
    except SystemExit as e:
        if e.code not in (None, 0): print(e.code if isinstance(e.code, str) else f"stopped ({e.code})", file=sys.stderr)
        return e.code in (None, 0)
    except Exception:
        traceback.print_exc(); return False

def run_args(args):
    run = _prepare(); sys.argv = ["run.py", *args]
    return _call(run.main)

def build_game():
    def go():
        sys.argv = ["game/build.py"]
        exec(compile(open(ROOT / "game/build.py").read(), str(ROOT / "game/build.py"), "exec"),
             {"__file__": str(ROOT / "game/build.py"), "__name__": "__main__"})
    return _call(go)

def ls():
    return json.dumps([{"path": str(p.relative_to(ROOT)), "size": p.stat().st_size}
                       for p in sorted(ROOT.rglob("*")) if p.is_file() and "__pycache__" not in p.parts])

def zip_workspace():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(ROOT.rglob("*")):
            if p.is_file() and "__pycache__" not in p.parts: z.write(p, "tileharness/" + str(p.relative_to(ROOT)))
    return buf.getvalue()

def unzip_workspace(data):
    raw = data.to_bytes() if hasattr(data, "to_bytes") else bytes(data)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        names = [n for n in z.namelist() if not n.endswith("/") and "__MACOSX" not in n]
        top = os.path.commonprefix(names); top = top[:top.rfind("/") + 1] if "/" in top else ""   # a zip of the folder, or of its contents
        for n in names:
            dest = ROOT / n[len(top):]; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(z.read(n))
    for k in [k for k in sys.modules if k == "run" or k == "harness" or k.startswith("harness.")]: del sys.modules[k]   # pick up any changed code
    return len(names)

def clear_outputs():
    for d in ("out", "textures"): shutil.rmtree(ROOT / d, ignore_errors=True)
    (ROOT / "picks.json").unlink(missing_ok=True)
`;

let py;
const say = (text, stream = "out") => postMessage({ type: "log", text, stream });

async function boot() {
  say("Loading Python (Pyodide)…", "info");
  py = await loadPyodide({ indexURL: PYODIDE });
  py.setStdout({ batched: t => say(t) });
  py.setStderr({ batched: t => say(t, "err") });
  say("Loading numpy, OpenCV and Pillow (about 15 MB the first time)…", "info");
  await py.loadPackage(["numpy", "opencv-python", "pillow"], { messageCallback: () => {} });
  say("Fetching the harness…", "info");
  const want = [...FILES.map(f => [f, "py/" + f]), ...Object.entries(EXTRA)];
  await Promise.all(want.map(async ([dest, src]) => {
    const r = await fetch(src); if (!r.ok) throw new Error(`couldn't fetch ${src} (${r.status})`);
    const path = "/h/" + dest; py.FS.mkdirTree(path.slice(0, path.lastIndexOf("/")));
    py.FS.writeFile(path, new Uint8Array(await r.arrayBuffer()));
  }));
  py.runPython(SETUP);
}
const booted = boot();

const ops = {
  run: ({ args }) => py.globals.get("run_args")(py.toPy(args)),
  build: () => py.globals.get("build_game")(),
  ls: () => JSON.parse(py.globals.get("ls")()),
  read: ({ path }) => py.FS.readFile("/h/" + path),
  write: ({ path, data }) => { const p = "/h/" + path; py.FS.mkdirTree(p.slice(0, p.lastIndexOf("/"))); py.FS.writeFile(p, data); },
  rm: ({ path }) => py.FS.unlink("/h/" + path),
  zip: () => { const b = py.globals.get("zip_workspace")(); const out = b.toJs(); b.destroy(); return out; },
  unzip: ({ data }) => py.globals.get("unzip_workspace")(data),
  clear: () => py.globals.get("clear_outputs")(),
  env: ({ key, value }) => { py.runPython("import os"); py.globals.get("os").environ.set(key, value || ""); },
};

onmessage = async ({ data: { id, op, ...args } }) => {
  try {
    await booted;
    let result = await ops[op](args);
    if (result && typeof result.toJs === "function") result = result.toJs();
    postMessage({ type: "done", id, result });
  } catch (e) {
    postMessage({ type: "done", id, error: String(e && e.message || e) });
  }
};
booted.then(() => postMessage({ type: "ready" }), e => postMessage({ type: "fail", error: String(e && e.message || e) }));
