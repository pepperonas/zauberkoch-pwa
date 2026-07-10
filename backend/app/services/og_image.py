"""Dynamic OG thumbnails (1200x630) for shared recipes — Pillow, disk-cached."""

import logging
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.core.config import get_settings

logger = logging.getLogger("zauberkoch.og")

W, H = 1200, 630
FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

# Mode palettes (match frontend tokens.css)
PALETTES = {
    "kochen": {"bg": (255, 248, 244), "primary": (150, 73, 0), "container": (255, 220, 194), "on": (34, 26, 19)},
    "cocktail": {"bg": (253, 247, 255), "primary": (130, 49, 180), "container": (242, 218, 255), "on": (29, 26, 32)},
}


def _font(name: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    try:
        font = ImageFont.truetype(str(FONT_DIR / name), size)
        try:
            font.set_variation_by_axes([weight])
        except OSError:
            pass
        return font
    except OSError:
        logger.warning("font %s missing — using default", name)
        return ImageFont.load_default(size)  # type: ignore[return-value]


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int, max_lines: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
            if len(lines) == max_lines - 1:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    used = " ".join(lines)
    if used != text and lines:
        lines[-1] = lines[-1].rstrip(".,") + " …"
    return lines


def _pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont, fill, on) -> int:
    """Draw a rounded stat pill, return its right edge."""
    x, y = xy
    pad_x, pad_y = 28, 16
    tw = int(draw.textlength(text, font=font))
    th = font.size
    draw.rounded_rectangle([x, y, x + tw + 2 * pad_x, y + th + 2 * pad_y], radius=(th + 2 * pad_y) // 2, fill=fill)
    draw.text((x + pad_x, y + pad_y - 2), text, font=font, fill=on)
    return x + tw + 2 * pad_x + 16


def render_og(recipe: dict, mode: str) -> Image.Image:
    pal = PALETTES.get(mode, PALETTES["kochen"])
    img = Image.new("RGB", (W, H), pal["bg"])
    draw = ImageDraw.Draw(img)

    # Warm glow top-right
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([W - 620, -320, W + 240, 340], fill=70)
    img.paste(Image.new("RGB", (W, H), pal["container"]), (0, 0), glow)

    # Accent bar left
    draw.rounded_rectangle([64, 64, 76, H - 64], radius=6, fill=pal["primary"])

    margin = 120
    y = 96

    kueche_font = _font("Inter.ttf", 34, 650)
    kueche = (recipe.get("kueche") or "").upper()
    label = f"{'🍸 ' if mode == 'cocktail' else ''}{kueche}".strip()
    draw.text((margin, y), label, font=kueche_font, fill=pal["primary"])
    y += 72

    title_font = _font("Bricolage.ttf", 88, 750)
    for line in _wrap(draw, recipe.get("titel", ""), title_font, W - margin - 90, 3):
        draw.text((margin, y), line, font=title_font, fill=pal["on"])
        y += 100

    teaser_font = _font("Inter.ttf", 34, 400)
    y += 12
    for line in _wrap(draw, recipe.get("teaser", ""), teaser_font, W - margin - 120, 2):
        draw.text((margin, y), line, font=teaser_font, fill=tuple(min(c + 60, 255) for c in pal["on"]))
        y += 48

    # Stat pills bottom
    pill_font = _font("Inter.ttf", 32, 550)
    py = H - 170
    px = margin
    stats: list[str] = []
    if recipe.get("zeit_gesamt"):
        stats.append(f"{recipe['zeit_gesamt']} Min.")
    if recipe.get("schwierigkeit"):
        stats.append(str(recipe["schwierigkeit"]))
    if recipe.get("portionen"):
        stats.append(f"{recipe['portionen']} {'Drinks' if mode == 'cocktail' else 'Portionen'}")
    for stat in stats[:3]:
        px = _pill(draw, (px, py), stat, pill_font, pal["container"], pal["primary"])

    # Brand
    brand_font = _font("Bricolage.ttf", 40, 700)
    brand = "zauberkoch.de"
    bw = draw.textlength(brand, font=brand_font)
    draw.text((W - bw - 72, H - 88), brand, font=brand_font, fill=pal["primary"])

    return img


def og_png_path(token: str) -> Path:
    settings = get_settings()
    og_dir = settings.db_path.parent / "og"
    og_dir.mkdir(parents=True, exist_ok=True)
    return og_dir / f"{token}.png"


def get_or_render(token: str, recipe: dict, mode: str) -> Path:
    path = og_png_path(token)
    if not path.exists():
        render_og(recipe, mode).save(path, "PNG", optimize=True)
    return path


def evict(token: str) -> None:
    og_png_path(token).unlink(missing_ok=True)
