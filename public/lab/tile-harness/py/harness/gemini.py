"""Gemini image generation, behind one function.

Needs:  pip install google-genai      and   export GEMINI_API_KEY=...
Model ids change; check https://ai.google.dev/gemini-api/docs/image-generation.
As of late 2026: gemini-3-pro-image (best, takes style references),
gemini-3.1-flash-image (fast), gemini-3.1-flash-lite-image (cheapest, 1K only).

Every image is saved with a sidecar .json recording the prompt, model,
references and time, so provenance travels with the file.
"""
import os, json, time, pathlib

DEFAULT_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")


def generate(prompt, out_path, refs=(), model=DEFAULT_MODEL, size="1K", aspect="1:1", meta=None):
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise SystemExit("Install the SDK first:  pip install google-genai")
    from PIL import Image
    client = genai.Client()                                    # reads GEMINI_API_KEY
    contents = [prompt] + [Image.open(r) for r in refs]
    cfg = types.GenerateContentConfig(response_modalities=["IMAGE"],
                                      image_config=types.ImageConfig(aspect_ratio=aspect, image_size=size))
    resp = client.models.generate_content(model=model, contents=contents, config=cfg)
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None) and part.inline_data.data:
            out = pathlib.Path(out_path); out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(part.inline_data.data)
            json.dump({"prompt": prompt, "model": model, "refs": [str(r) for r in refs], "size": size,
                       "made": time.strftime("%Y-%m-%d %H:%M:%S"), "source": "Gemini (SynthID watermarked)", **(meta or {})},
                      open(out.with_suffix(".json"), "w"), indent=1)
            return out
    raise RuntimeError("No image came back. Text reply: " + " ".join(getattr(p, "text", "") or "" for p in resp.candidates[0].content.parts))
