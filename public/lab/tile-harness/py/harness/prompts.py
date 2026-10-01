"""Prompts for material images, written as slots so they can be bred.

A prompt is a dict of slot -> phrase. `render` joins it into text; `mutate`
swaps one or two slots for alternatives, so a picked image's children stay
close to it but explore nearby.
"""
import random

COMMON = ("Photographic texture study, shot straight down, flat and evenly lit, "
          "filling the whole frame edge to edge. No tile edges, no pattern, no objects, "
          "no text, no shadows, no vignette.")

SLOTS = {
    "clay": {
        "subject": ["unglazed medieval red earthenware tile surface", "the fired red clay body of a 13th-century floor tile", "worn terracotta paving surface"],
        "grain": ["fine sandy grog with small pale inclusions", "coarse grog and tiny dark iron specks", "smooth fine clay with faint wiping marks"],
        "tone": ["warm brick red", "deep oxblood red", "orange-red with darker reduction patches"],
        "age": ["softly worn by feet", "lightly pitted", "dusty and matt"],
    },
    "slip": {
        "subject": ["pale cream pipeclay slip inlaid in a medieval tile", "white slip filling on an encaustic tile", "cream clay inlay surface"],
        "grain": ["with tiny pinholes", "with faint brush streaks", "with minute dark specks"],
        "tone": ["warm cream", "pale straw yellow", "ivory with a pink blush"],
        "age": ["slightly worn", "chalky and dry", "polished smooth by use"],
    },
    "craze": {
        "subject": ["fine crazing in an old lead glaze", "crackle network in amber glaze on red clay", "hairline craze lines in a worn glaze"],
        "grain": ["small irregular cells", "large cells with a few finer ones inside", "dense cells with dirt in the cracks"],
        "tone": ["dark lines on a pale ground", "black hairlines on honey-coloured glaze", "brown lines on amber"],
        "age": ["centuries old", "dirt-filled", "very fine"],
    },
    "wear": {
        "subject": ["abstract map of wear on a stone floor, white where worn, black where untouched", "greyscale mask of foot-traffic wear", "soft cloudy greyscale patches of abrasion"],
        "grain": ["ragged edges", "soft edges with speckled borders", "streaky along one direction"],
        "tone": ["high contrast", "mostly dark with a few bright patches", "balanced"],
        "age": ["", "", ""],
    },
    "stain": {
        "subject": ["damp staining on an old floor, greyscale", "tide marks and water stains, greyscale", "soot and mortar stains, greyscale"],
        "grain": ["soft blotches", "rings and drips", "speckles and smears"],
        "tone": ["mostly clean with a few marks", "heavily marked", "patchy"],
        "age": ["", "", ""],
    },
}


def fresh(kind, rnd=random):
    return {k: rnd.choice(v) for k, v in SLOTS[kind].items()}


def render(kind, slots, extra=""):
    words = ", ".join(v for v in slots.values() if v)
    return f"{words}. {COMMON} {extra}".strip()


def mutate(kind, slots, rnd=random, n=1):
    child = dict(slots)
    for k in rnd.sample(list(SLOTS[kind]), n):
        child[k] = rnd.choice([v for v in SLOTS[kind][k] if v != slots.get(k)] or SLOTS[kind][k])
    return child
