#!/usr/bin/env python3
"""Convert '5572' text to SVG outline paths and write a font-independent master icon."""
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
import os

FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
BASE = os.path.dirname(os.path.abspath(__file__))

text = "5572"
font_size = 186.0
UPEM = 2048
scale = font_size / UPEM

font = TTFont(FONT)
glyphset = font.getGlyphSet()
cmap = font.getBestCmap()


def glyph_path_for_char(ch):
    code = ord(ch)
    gname = cmap[code]
    pen = SVGPathPen(glyphset)
    tf = TransformPen(pen, Transform(scale, 0, 0, scale, 0, 0))
    glyphset[gname].draw(tf)
    return pen.getCommands()


# width per glyph for positioning (horizontal advance)
hmtx = font["hmtx"]
def advance_for_char(ch):
    gname = cmap[ord(ch)]
    return hmtx[gname][0] * scale

# measure total width
widths = [advance_for_char(c) for c in text]
total_width = sum(widths)
# add letter-spacing (2px * 3 gaps)
letter_spacing = 6
total_width += letter_spacing

# Build the glyph <g> translated so it's centered at x=256
x_cursor = -total_width / 2.0
parts = []
for i, ch in enumerate(text):
    parts.append(f'<path d="{glyph_path_for_char(ch)}" transform="translate({x_cursor:.3f} 0)"/>')
    x_cursor += widths[i]
    if i < len(text) - 1:
        x_cursor += letter_spacing

# vertical: we want the FULL composition (digits + play + underline) optically centered ~y=256.
# Baseline placement: digits occupy baseline - 129..baseline. Place accents below.
glyphs_y = 170  # baseline y for digits

g_content = "\n".join(parts)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8C547"/>
      <stop offset="55%" stop-color="#F4C24D"/>
      <stop offset="100%" stop-color="#D79E1E"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.32)"/>
      <stop offset="42%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" fill="url(#bg)"/>
  <rect x="0" y="0" width="512" height="240" fill="url(#sheen)"/>
  <g fill="#171717">
    <g transform="translate(256 {glyphs_y})">
{g_content}
    </g>
  </g>
  <polygon points="284,340 284,392 324,366" fill="#171717"/>
  <rect x="120" y="416" width="272" height="10" rx="5" fill="#FFF6DE"/>
</svg>
'''

out = os.path.join(BASE, "icon-master.svg")
with open(out, "w", encoding="utf-8") as f:
    f.write(svg)
print("wrote", out)

# Foreground: transparent bg, glyph group scaled into safe zone
fg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <g transform="translate(256,256) scale(0.72) translate(-256,-256)">
    <g fill="#171717">
      <g transform="translate(256 {glyphs_y})">
{g_content}
      </g>
    </g>
    <polygon points="284,390 284,442 324,416" fill="#171717"/>
    <rect x="120" y="466" width="272" height="10" rx="5" fill="#FFF6DE"/>
  </g>
</svg>
'''
out_fg = os.path.join(BASE, "icon-foreground.svg")
with open(out_fg, "w", encoding="utf-8") as f:
    f.write(fg)
print("wrote", out_fg)