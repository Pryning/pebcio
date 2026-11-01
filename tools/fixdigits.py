"""Make the 7-Segment font's digits render without wobble.

Font converters place each glyph by its own bounding box, rounded on its own,
so a segment can land a pixel apart in two digits that share it (a "1" starts
at a different fraction of a pixel than an "8"). This gives every digit, the
blank and the colon the bounding box of the "8": the digits are decomposed
into plain outlines and get two single-point contours at the 8's corners,
which draw nothing but count for the box.

Used by make_seg7.sh.

usage: fixdigits.py SRC.ttf DST.ttf NEW_FAMILY
"""
import sys

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates, flagOnCurve

src, dst, family = sys.argv[1], sys.argv[2], sys.argv[3]
font = TTFont(src)
cmap = font.getBestCmap()
glyf = font["glyf"]
gs = font.getGlyphSet()

eight = glyf[cmap[ord("8")]]
eight.recalcBounds(glyf)
corners = [(eight.xMin, eight.yMin), (eight.xMax, eight.yMax)]

for ch in "0123456789: ":
    name = cmap[ord(ch)]
    rec = DecomposingRecordingPen(gs)
    gs[name].draw(rec)
    pen = TTGlyphPen(None)
    rec.replay(pen)
    g = pen.glyph()
    # Single-point contours (the pen drops them, so they are added directly)
    if g.numberOfContours <= 0:
        g.numberOfContours, g.endPtsOfContours = 0, []
        g.coordinates, g.flags = GlyphCoordinates(), bytearray()
        g.program = ttProgram.Program()
        g.program.fromBytecode(b"")
    for pt in corners:
        g.coordinates.append(pt)
        g.flags.append(flagOnCurve)
        g.endPtsOfContours.append(len(g.coordinates) - 1)
        g.numberOfContours += 1
    g.recalcBounds(glyf)
    glyf[name] = g
    adv, _ = font["hmtx"].metrics[name]
    font["hmtx"].metrics[name] = (adv, g.xMin)

# OFL: rename the modified font
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
