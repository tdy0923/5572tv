#!/usr/bin/env python3
"""Generate 5572 app icons (web/PWA + Android) from icon-master.svg.
Renders master at 1024 then downscales for robustness at small sizes.
"""
import cairosvg
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "icon-master.svg")
FOREGROUND = os.path.join(BASE, "icon-foreground.svg")
ICON_DIR = BASE
PUBLIC = os.path.abspath(os.path.join(BASE, "..", ".."))  # repo root
REPO = PUBLIC

WEB_SIZES = [72, 96, 128, 144, 152, 192, 256, 384, 512]
ANDROID_FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
ANDROID_LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def render_at(svg, size):
    """Render SVG, return PIL Image resized to size."""
    tmp = "/tmp/opencode/_icon_%d.png" % int(size * round(os.getpid())) 
    tmp = "/tmp/opencode/_icon_%s.png" % (svg.split("/")[-1].replace(".", "_") + "_" + str(size))
    cairosvg.svg2png(url=svg, write_to=tmp, output_width=size, output_height=size)
    return Image.open(tmp).convert("RGBA")


def render(src_svg, dest, size):
    img = render_at(src_svg, size)
    img.save(dest, "PNG")
    print(f"  wrote {os.path.basename(dest)} ({size}x{size})")


def main():
    fg_dir = os.path.join(REPO, "flutter_app/android/app/src/main/res")

    print("== Web / PWA icons ==")
    for s in WEB_SIZES:
        render(SRC, os.path.join(ICON_DIR, f"icon-{s}x{s}.png"), s)

    print("== public/icon-192.png & icon-512.png ==")
    render(SRC, os.path.join(PUBLIC, "public", "icon-192.png"), 192)
    render(SRC, os.path.join(PUBLIC, "public", "icon-512.png"), 512)

    print("== Android adaptive foreground ==")
    for dpi, size in ANDROID_FG.items():
        render(FOREGROUND, os.path.join(fg_dir, f"drawable-{dpi}", "ic_launcher_foreground.png"), size)

    print("== Android legacy launcher_icon ==")
    for dpi, size in ANDROID_LEGACY.items():
        render(SRC, os.path.join(fg_dir, f"mipmap-{dpi}", "launcher_icon.png"), size)
        render(SRC, os.path.join(fg_dir, f"mipmap-{dpi}", "ic_launcher.png"), size)

    print("== iOS/apple sizes ==")
    render(SRC, os.path.join(ICON_DIR, "icon-120x120.png"), 120)
    render(SRC, os.path.join(ICON_DIR, "icon-180x180.png"), 180)

    print("== Android background color ==")
    colors_path = os.path.join(fg_dir, "values", "colors.xml")
    with open(colors_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write("<resources>\n")
        f.write('    <color name="launch_background">#F4C24D</color>\n')
        f.write('    <color name="ic_launcher_background">#F4C24D</color>\n')
        f.write("</resources>\n")
    print(f"  wrote {os.path.basename(colors_path)}")

    print("Done.")


if __name__ == "__main__":
    main()