#!/bin/sh
# Build the pixel-stable copies of the 7-Segment font used for the time and
# seconds: Segment7Px<size>.ttf in src/embeddedjs/assets.
#
# The watch build converts fonts with fontbm, which forces FreeType's
# auto-hinter on every glyph. The auto-hinter adjusts each digit on its own, so
# the same segment could land a pixel apart in two digits ("wobble"). To stop
# that, every digit gets the 8's bounding box (fixdigits.py), the font is cut
# down to the digits, colon and space so the auto-hinter finds no reference
# heights to align to, and the outlines are snapped to the pixel grid of each
# size (snapfont.py), leaving nothing to adjust.
#
# usage: tools/make_seg7.sh PYTHON  (a Python with fontTools installed)
set -e
PY=${1:-python3}
cd "$(dirname "$0")/.."
ASSETS=src/embeddedjs/assets
TMP=$(mktemp -d)

"$PY" tools/fixdigits.py "$ASSETS/Segment7.ttf" "$TMP/fixed.ttf" "Segment7 Stable"
"$PY" -m fontTools.subset "$TMP/fixed.ttf" --text="0123456789: " --glyph-names \
    --no-hinting --output-file="$TMP/digits.ttf"
for size in 72 44 24; do
    "$PY" tools/snapfont.py "$TMP/digits.ttf" "$ASSETS/Segment7Px$size.ttf" "$size" "Segment7 Px$size"
done
rm -r "$TMP"
