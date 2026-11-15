"""Generate the vector geometry shared by every Upkeep brand asset.

Outputs ``branding/paths.json``:
  - ``wordmark``: the word "upkeep" in Outfit SemiBold, converted to outlines
  - ``mono``: the roof and the full "u" as one filled outline (sidebar icon)

Usage (needs fonttools and skia-pathops; run from the repo root):
    python branding/generate.py path/to/Outfit-SemiBold.ttf

The committed ``paths.json`` is the build input, so this only has to run when the
mark or the wordmark changes. Outfit is licensed under the SIL OFL (see
``branding/LICENSE-Outfit.txt``).
"""

import json
import sys
from pathlib import Path

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

WORD = "upkeep"
TRACKING = -0.02  # em, matches the design (letter-spacing: -0.02em)
STROKE = 28


def wordmark(font_file: str) -> dict:
    font = TTFont(font_file)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    x = 0.0
    for ch in WORD:
        name = cmap[ord(ch)]
        # Flip Y: font units grow upwards, SVG downwards. Origin is the baseline.
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        x += glyphs[name].width + TRACKING * upm
    x -= TRACKING * upm  # no tracking after the last glyph
    return {
        "d": pen.getCommands(),
        "unitsPerEm": upm,
        "advance": round(x, 2),
        "xHeight": font["OS/2"].sxHeight,
        "ascender": font["OS/2"].sTypoAscender,
        "descender": font["OS/2"].sTypoDescender,
    }


def mono() -> str:
    roof = pathops.Path()
    roof.moveTo(36, 114)
    roof.lineTo(128, 40)
    roof.lineTo(220, 114)

    # Lower half circle of the "u": (62,158) -> (194,158), centre (128,158), r 66.
    k = 66 * 0.5522847498
    u = pathops.Path()
    u.moveTo(62, 136)
    u.lineTo(62, 158)
    u.cubicTo(62, 158 + k, 128 - k, 224, 128, 224)
    u.cubicTo(128 + k, 224, 194, 158 + k, 194, 158)
    u.lineTo(194, 136)

    outlines = []
    for p in (roof, u):
        p.stroke(STROKE, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
        p.convertConicsToQuads(0.05)
        outlines.append(p)
    merged = pathops.op(outlines[0], outlines[1], pathops.PathOp.UNION)
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    merged.draw(pen)
    return pen.getCommands()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = {"wordmark": wordmark(sys.argv[1]), "mono": mono()}
    target = Path(__file__).with_name("paths.json")
    target.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {target}")
