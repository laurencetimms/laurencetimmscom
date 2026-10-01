# Tile harness

Each part of a Pavement tile comes from the tool that's good at it:

| Layer | Made by | Why |
|---|---|---|
| **Design** (the pattern the game plays on) | old plates and photographs, cleaned and corrected by code | it must be exact: symmetric, continuous across seams, unambiguous when turned |
| **Material** (clay, slip, crazing, wear, stains) | Gemini, photographs, or procedural stand-ins | it only has to look right; it never touches a seam test |
| **Composite** (worn → sharp → glazed) | the game, in the browser | every tile gets its own crop of each texture, so no two tiles look alike, and all the stages stay pixel-aligned |

## Quick start

```
pip install opencv-python numpy pillow scipy
python run.py all                  # stand-in materials, every plate in sources/, pack, gallery
python game/build.py               # out/pavement-workshop.html, the game using the pack
```

Open `out/gallery.html` to see what was made, and `out/pavement-workshop.html` to play with it.

## The loop

1. **Find designs.** Put scans or photos in `sources/`. Good public-domain sources:
   - John Gough Nichols, *Examples of Decorative Tiles, sometimes termed Encaustic* (1845)
   - Henry Shaw, *Specimens of Tile Pavements* (1858)

   Both are on archive.org. Crop roughly to one design (a four-tile roundel, say); the
   harness finds the exact square itself.
2. **Run the design pipeline:** `python run.py design sources/my_plate.jpg`. This:
   - finds the design and squares it up, correcting skew and perspective;
   - splits it into slip and clay (`--colours 3` adds green glaze);
   - removes specks and grout lines;
   - re-centres it;
   - makes it exactly symmetric by a vote between its quarters (`--group d4` for a
     roundel, `c4` for a pinwheel, `d2`, `mirror` or `none`). A flaw in one quarter is
     outvoted by the other three.
   - checks it the way the game will, and writes `out/designs/<name>/`.
3. **Read the report.** `report.json` and the gallery say whether the design plays:
   - seams carry pattern;
   - no wrong turn fits;
   - readable at 48 px;
   - no hairlines or slivers;
   - detail kept by the vote.

   A design that **fails** is left out of the pack.
4. **Make materials.** Choose one of these:
   - `python run.py standins` for procedural stand-ins;
   - drop your own images into `textures/raw/` named `clay__…`, `slip__…`,
     `craze__…`, `wear__…` or `stain__…`;
   - generate them with Gemini (below).

   Then run `python run.py materials`.
5. **Choose.** Run `python run.py gallery` and open `out/gallery.html`. Click what you
   like, press **Save picks**, and put `picks.json` in this folder.
6. **Breed** (Gemini only): `python run.py generate clay -n 6 --breed`. This makes
   children of the clay images you picked. Each child's prompt is a parent's prompt
   with one slot changed, and the parent image goes in as a reference. Pick again and
   repeat.
7. **Pack and play:** `python run.py pack`, then `python game/build.py`.

## Gemini

```
pip install google-genai
export GEMINI_API_KEY=...            # from https://aistudio.google.com/apikey
python run.py generate clay -n 4
python run.py generate craze -n 4 --refs my_photos/crazed_glaze.jpg
```

- **Models:** the default is `gemini-3-pro-image`, which takes style references. Set
  `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image` for faster, cheaper runs. Model names
  change; check https://ai.google.dev/gemini-api/docs/image-generation.
- **Prompts** are in `harness/prompts.py` as slots (subject, grain, tone, age). Every
  prompt asks for a flat, evenly lit, top-down surface with no pattern and no tile
  edges. Ask for **surfaces, not tiles**: the moment Gemini draws a pattern, it
  belongs to the design layer, and the design layer has to be exact.
- **No API key?** Generate in the Gemini app and save the images into `textures/raw/`
  with the right prefix. Everything else works the same, except breeding.
- **Provenance:** every generated image gets a `.json` sidecar recording its prompt,
  model, references and date. Gemini images carry an invisible SynthID watermark.

## Licences and provenance

Keep a note of where every source came from. In practice:

- Wikimedia Commons images vary:
  - public domain is free to use;
  - CC BY needs a credit;
  - CC BY-SA may require your derived images to carry the same licence.
- Many museum photographs are licensed for non-commercial use only.
- The two 19th-century books above are out of copyright.

## What's here

```
run.py                  the commands
harness/design.py       find, square, classify, tidy, recentre, symmetrise, smooth, slice, export
harness/validate.py     the checks, using the game's own seam reading
harness/materials.py    flatten lighting, lock palette, extract crack networks
harness/standins.py     procedural stand-in materials
harness/prompts.py      prompt slots and mutation for breeding
harness/gemini.py       the one function that calls Gemini
harness/curate.py       the picking page
game/material.js        the in-browser compositor (worn / sharp / glaze from the pack)
game/build.py           puts the pack and compositor into Pavement
sources/                input plates (the two here are synthetic stand-ins)
```

## Limits worth knowing

- **Symmetry by vote needs the source's quarters to roughly agree.** Features smaller
  than the drawing's wobble can be outvoted; the "detail kept by the vote" check flags
  this. If it fails, use a cleaner source or `--group none`.
- **A plate's edge motifs are completed in the neighbouring tiles.** Corner roses and
  rings that touch the block's edge continue across the seam into the next tiles, as
  a real pavement does. For this the design must be D4-symmetric (the default group).
- **One plate per floor**, so neighbouring roundels always meet properly.
