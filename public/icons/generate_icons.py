#!/usr/bin/env python3
"""Generate 5572 app icons (web/PWA + iOS + Android adaptive).

Design: Archivo Black字库 "5" + Lucide风格圆角播放三角，渲染自
icon-master.svg（完整图标）与 icon-foreground.svg（透明底字形，
供 Android adaptive）。换品牌字符只需改 SVG 内 <text> 后重跑本脚本。

字体自举：优先系统已装 Archivo Black，否则从 fonts/ 目录临时安装到
~/.fonts（需 fc-cache）。另产出 favicon.ico 与 public/logo.png。
"""
import cairosvg
import os
import shutil
import subprocess
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "icon-master.svg")
FOREGROUND = os.path.join(BASE, "icon-foreground.svg")
PUBLIC = os.path.abspath(os.path.join(BASE, "..", ".."))
REPO = PUBLIC

WEB_SIZES = [72, 96, 128, 144, 152, 192, 256, 384, 512]
ANDROID_FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
ANDROID_LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
IOS_ICONS = {
    "Icon-App-20x20@2x.png": 40, "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29, "Icon-App-29x29@2x.png": 58, "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@2x.png": 80, "Icon-App-40x40@3x.png": 120,
    "Icon-App-60x60@2x.png": 120, "Icon-App-60x60@3x.png": 180,
    "Icon-App-76x76@1x.png": 76, "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}


def render_at(svg, size):
    """Render SVG at exact size, return PIL Image."""
    tmp = f"/tmp/opencode/_icon_{os.path.basename(svg)}_{size}.png"
    os.makedirs("/tmp/opencode", exist_ok=True)
    cairosvg.svg2png(url=svg, write_to=tmp, output_width=size, output_height=size)
    return Image.open(tmp).convert("RGBA")


def render(svg, dest, size, crop_box=None):
    """Render SVG, optionally crop to box, save to dest."""
    img = render_at(svg, size)
    if crop_box:
        img = img.crop(crop_box)
    img.save(dest, "PNG")
    print(f"  wrote {os.path.basename(dest)} ({size}x{size})")


def round_corner_mask(size, radius):
    """Return a rounded-square alpha mask for iOS-style icons."""
    mask = Image.new("L", (size, size), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


FONT_FILE = os.path.join(BASE, "fonts", "ArchivoBlack-Regular.ttf")


def ensure_font():
    """保证 Archivo Black 可被 SVG 渲染解析；缺失时从 fonts/ 自举安装。"""
    try:
        out = subprocess.run(
            ["fc-list"], capture_output=True, text=True, timeout=30
        ).stdout
        if "Archivo Black" in out:
            print("  font: Archivo Black 已安装")
            return
    except Exception:
        pass
    home_fonts = os.path.expanduser("~/.fonts")
    os.makedirs(home_fonts, exist_ok=True)
    dest = os.path.join(home_fonts, "ArchivoBlack-Regular.ttf")
    if not os.path.exists(dest):
        if not os.path.exists(FONT_FILE):
            raise SystemExit("缺字体：fonts/ArchivoBlack-Regular.ttf 不存在")
        shutil.copy(FONT_FILE, dest)
        print(f"  font: 已自举安装到 {dest}")
    subprocess.run(["fc-cache", "-f"], capture_output=True, timeout=60)


def main():
    ensure_font()
    fg_dir = os.path.join(REPO, "flutter_app/android/app/src/main/res")
    ios_dir = os.path.join(
        REPO, "flutter_app/ios/Runner/Assets.xcassets/AppIcon.appiconset"
    )

    # ── Web / PWA ──
    print("== Web / PWA icons ==")
    for s in WEB_SIZES:
        render(SRC, os.path.join(BASE, f"icon-{s}x{s}.png"), s)

    # ── Android adaptive foreground (glyph-only, transparent bg) ──
    print("== Android adaptive foreground ==")
    for dpi, s in ANDROID_FG.items():
        render(FOREGROUND, os.path.join(fg_dir, f"drawable-{dpi}", "ic_launcher_foreground.png"), s)

    # ── Android legacy launcher_icon (full icon) ──
    print("== Android legacy launcher_icon ==")
    for dpi, s in ANDROID_LEGACY.items():
        render(SRC, os.path.join(fg_dir, f"mipmap-{dpi}", "launcher_icon.png"), s)
        render(SRC, os.path.join(fg_dir, f"mipmap-{dpi}", "ic_launcher.png"), s)

    # ── iOS / apple ──
    print("== iOS/apple ==")
    for name, s in IOS_ICONS.items():
        dest = os.path.join(ios_dir, name)
        if s < 1024:
            img = render_at(SRC, s)
            radius = int(s * 0.225)
            mask = round_corner_mask(s, radius)
            img.putalpha(mask)
            img.save(dest, "PNG")
            print(f"  wrote {name} ({s}x{s})")
        else:
            render(SRC, dest, s)

    # ── Android background color ──
    colors_path = os.path.join(fg_dir, "values", "colors.xml")
    with open(colors_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write("<resources>\n")
        f.write('    <color name="launch_background">#F4C24D</color>\n')
        f.write('    <color name="ic_launcher_background">#F4C24D</color>\n')
        f.write("</resources>\n")
    print(f"  wrote {os.path.basename(colors_path)}")

    # ── Content safe‑zone verification ──
    print("\n== Safe‑zone verification (512px) ==")
    img = render_at(SRC, 512)
    px = img.load()
    dark_min_x, dark_max_x, dark_min_y, dark_max_y = 512, 0, 512, 0
    for y in range(512):
        for x in range(512):
            r, g, b, a = px[x, y]
            if a > 100 and r < 60 and g < 60 and b < 60:
                dark_min_x = min(dark_min_x, x)
                dark_max_x = max(dark_max_x, x)
                dark_min_y = min(dark_min_y, y)
                dark_max_y = max(dark_max_y, y)
    print(f"  Glyph bounds: x[{dark_min_x}–{dark_max_x}] y[{dark_min_y}–{dark_max_y}]")
    print(f"  Glyph size: {dark_max_x - dark_min_x}×{dark_max_y - dark_min_y}")
    center = 256
    safe = 205  # 80 % of 512
    safe_ok = (
        dark_min_x >= center - safe
        and dark_max_x <= center + safe
        and dark_min_y >= center - safe
        and dark_max_y <= center + safe
    )
    print(f"  Maskable safe zone (80%): x[{center-safe}–{center+safe}] y[{center-safe}–{center+safe}]")
    print(f"  {'✅ All content within safe zone' if safe_ok else '❌ Content exceeds safe zone!'}")

    # ── favicon.ico（多尺寸，浏览器标签页）──
    print("\n== favicon.ico ==")
    fav = render_at(SRC, 256)
    fav_path = os.path.join(PUBLIC, "public", "favicon.ico")
    fav.save(
        fav_path,
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(f"  wrote favicon.ico")

    # ── logo.png（由 public/logo.svg 栅格化，保持徽标一致）──
    print("\n== logo.png ==")
    logo_svg = os.path.join(PUBLIC, "public", "logo.svg")
    if os.path.exists(logo_svg):
        tmp = "/tmp/opencode/_logo_1200.png"
        os.makedirs("/tmp/opencode", exist_ok=True)
        cairosvg.svg2png(
            url=logo_svg,
            write_to=tmp,
            output_width=1200,
            output_height=320,
        )
        Image.open(tmp).convert("RGBA").save(
            os.path.join(PUBLIC, "public", "logo.png"), "PNG"
        )
        print("  wrote logo.png (1200x320)")

    print("\nDone.")


if __name__ == "__main__":
    main()