"""Snap a font's outlines to the pixel grid of one size.

Every outline point and advance is rounded to a whole pixel at SIZE, so each
segment edge falls exactly on a pixel boundary and renders the same in every
digit. Use on a font prepared by fixdigits.py, whose digits all share the 8's
bounding box (also snapped), so the converter places them all alike.

usage: snapfont.py SRC.ttf DST.ttf SIZE NEW_FAMILY
"""
import sys

from fontTools.ttLib import TTFont

src, dst, size, family = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
font = TTFont(src)
unit = font["head"].unitsPerEm / size


def snap(v):
    return round(round(v / unit) * unit)


glyf = font["glyf"]
hmtx = font["hmtx"]
for name in font.getGlyphOrder():
    g = glyf[name]
    if g.numberOfContours > 0:
        g.coordinates = type(g.coordinates)([(snap(x), snap(y)) for x, y in g.coordinates])
        g.recalcBounds(glyf)
    adv, _ = hmtx[name]
    hmtx[name] = (snap(adv), getattr(g, "xMin", 0))

style = font["name"].getDebugName(2) or "Regular"
for rec in font["name"].names:
    if rec.nameID in (1, 16):
        rec.string = family
    elif rec.nameID in (3, 4):
        rec.string = f"{family} {style}"
    elif rec.nameID == 6:
        rec.string = f"{family}-{style}".replace(" ", "")
font.save(dst)
print("wrote", dst)
