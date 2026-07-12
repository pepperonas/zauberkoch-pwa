"""Dynamic OG thumbnails (1200x630) for shared recipes — Pillow, disk-cached.

The recipe's flat-vector motif (same art as the app cards) is baked in from
pre-rendered PNGs in assets/motifs/ — regenerate them via
`cd frontend && npm run export:motifs` whenever RecipeMotif.tsx changes.
"""

import logging
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.core.config import get_settings

logger = logging.getLogger("zauberkoch.og")

W, H = 1200, 630
STYLE_VERSION = 2  # bump to invalidate cached PNGs after a redesign
FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
MOTIF_DIR = Path(__file__).resolve().parent.parent / "assets" / "motifs"

# Mode palettes (match frontend tokens.css)
PALETTES = {
    "kochen": {"bg": (255, 248, 244), "primary": (150, 73, 0), "container": (255, 220, 194), "on": (34, 26, 19)},
    "cocktail": {"bg": (253, 247, 255), "primary": (130, 49, 180), "container": (242, 218, 255), "on": (29, 26, 32)},
}

# ---- motif matching (mirror of frontend RecipeMotif.motifForRecipe) ---------

_GLASS_CHECKS = [
    ("tiki", r"tiki|hurricane|zombie|mai tai"),
    ("mule", r"kupfer|mule|moscow"),
    ("coupe", r"coupe|cocktailschale|schale|nick|nora"),
    ("martini", r"martini|spitz|dreieck"),
    ("flute", r"sekt|champagner|flöte|flute|prosecco"),
    ("wine", r"weinglas|ballon|spritz|sangria|glühwein"),
    ("highball", r"longdrink|highball|collins|becher|fizz|lemonade|limonade|eistee"),
    ("tumbler", r"tumbler|old fashioned|rocks|whisk"),
]

_DISH_CHECKS = [
    ("pancakes", r"pfannkuchen|pancake|crêpe|crepe|waffel|kaiserschmarrn"),
    ("burger", r"burger"),
    ("pizza", r"pizza|flammkuchen|galette"),
    ("taco", r"taco|burrito|wrap|quesadilla|fajita|enchilada"),
    ("sandwich", r"sandwich|toast|stulle|bagel|panini|croque"),
    ("suppe", r"ramen|udon|soba|pho|suppe|eintopf|chowder|brühe|minestrone|gulasch"),
    ("auflauf", r"lasagne|auflauf|gratin|moussaka|casserole|überbacken|parmigiana"),
    ("pasta", r"pasta|spaghetti|tagliatelle|linguine|penne|nudel|gnocchi|carbonara|orecchiette"),
    ("bowl", r"bowl|poke|buddha|curry|risotto|porridge|dal"),
    ("dessert", r"dessert|kuchen|torte|tiramisu|mousse|pudding|brownie|cheesecake|crumble|panna cotta|sorbet"),
    ("salat", r"salat|caesar|caprese|tabouleh|slaw"),
    ("fisch", r"fisch|lachs|forelle|dorade|thunfisch|garnele|gamba|shrimp|scampi|muschel|kabeljau|zander|pulpo|oktopus|tintenfisch"),
    ("steak", r"steak|braten|filet|kotelett|schnitzel|rind|lamm|entrecôte|ribs|grill|bbq|hähnchen|fleisch|frikadelle|köfte"),
    ("pfanne", r"pfanne|wok|stir|geschnetzelt|shakshuka|rührei"),
]


def motif_for_recipe(recipe: dict, mode: str) -> str:
    glas = (recipe.get("glas") or "").lower()
    hay = " ".join(
        [glas, recipe.get("titel", ""), " ".join(recipe.get("tags", []) or []), recipe.get("kueche", "") or ""]
    ).lower()
    if mode == "cocktail":
        for source in (glas, hay):  # the stated glass wins over title words
            for name, pattern in _GLASS_CHECKS:
                if re.search(pattern, source):
                    return name
        return "tumbler"
    for name, pattern in _DISH_CHECKS:
        if re.search(pattern, hay):
            return name
    return "bowl"


def _fmt_min(minutes: int) -> str:
    if minutes < 90:
        return f"{minutes} Min."
    if minutes < 48 * 60:
        h, rest = divmod(minutes, 60)
        return f"{h} h" if rest == 0 else f"{h} h {rest} Min."
    tage, rest = divmod(minutes, 1440)
    rest_h = round(rest / 60)
    if rest_h == 24:
        tage, rest_h = tage + 1, 0
    label = f"{tage} {'Tag' if tage == 1 else 'Tage'}"
    return label if rest_h == 0 else f"{label} {rest_h} h"


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
    if max_lines <= 0:
        return []
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
            if len(lines) >= max_lines:  # budget full — drop the remainder
                current = ""
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


def _paste_motif(img: Image.Image, recipe: dict, mode: str, pal: dict) -> None:
    """Recipe motif on the right: soft tonal disc + the pre-rendered art."""
    motif = motif_for_recipe(recipe, mode)
    path = MOTIF_DIR / f"{motif}.png"
    if not path.exists():
        logger.warning("motif asset %s missing — OG rendered without art", motif)
        return

    cx, cy = W - 268, H // 2 - 12  # motif center

    # layered translucent discs (soft "stage" behind the art)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.ellipse([cx - 236, cy - 236, cx + 236, cy + 236], fill=(*pal["container"], 120))
    odraw.ellipse([cx - 196, cy - 196, cx + 196, cy + 196], fill=(*pal["container"], 175))
    img.alpha_composite(overlay)

    art = Image.open(path).convert("RGBA").resize((392, 392), Image.LANCZOS)
    img.alpha_composite(art, (cx - 196, cy - 196))


def render_og(recipe: dict, mode: str) -> Image.Image:
    pal = PALETTES.get(mode, PALETTES["kochen"])
    img = Image.new("RGBA", (W, H), (*pal["bg"], 255))
    draw = ImageDraw.Draw(img)

    # Warm glow top-right
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([W - 620, -320, W + 240, 340], fill=70)
    img.paste(Image.new("RGB", (W, H), pal["container"]), (0, 0), glow)

    # Accent bar left
    draw.rounded_rectangle([64, 64, 76, H - 64], radius=6, fill=pal["primary"])

    _paste_motif(img, recipe, mode, pal)
    draw = ImageDraw.Draw(img)

    margin = 120
    text_width = W - margin - 480  # keep clear of the motif stage
    y = 96

    kueche_font = _font("Inter.ttf", 34, 650)
    label = (recipe.get("kueche") or "").upper()  # no emoji — fonts have no color glyphs
    draw.text((margin, y), label, font=kueche_font, fill=pal["primary"])
    y += 72

    title_font = _font("Bricolage.ttf", 82, 750)
    title_lines = _wrap(draw, recipe.get("titel", ""), title_font, text_width, 3)
    for line in title_lines:
        draw.text((margin, y), line, font=title_font, fill=pal["on"])
        y += 94

    teaser_font = _font("Inter.ttf", 33, 400)
    y += 12
    # teaser gets whatever vertical budget is left above the stat pills
    pills_top = H - 170
    teaser_lines = min(3, (pills_top - 20 - y) // 48)
    for line in _wrap(draw, recipe.get("teaser", ""), teaser_font, text_width, teaser_lines):
        draw.text((margin, y), line, font=teaser_font, fill=tuple(min(c + 60, 255) for c in pal["on"]))
        y += 48

    # Stat pills bottom
    pill_font = _font("Inter.ttf", 32, 550)
    py = H - 170
    px = margin
    stats: list[str] = []
    if recipe.get("zeit_gesamt"):
        stats.append(_fmt_min(int(recipe["zeit_gesamt"])))
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

    return img.convert("RGB")


SW_, SH_ = 1080, 1920


def render_story(recipe: dict, mode: str) -> Image.Image:
    """9:16 share image (Insta story / WhatsApp status): motif front and
    center, title below, stat pills, brand footer."""
    pal = PALETTES.get(mode, PALETTES["kochen"])
    img = Image.new("RGBA", (SW_, SH_), (*pal["bg"], 255))
    draw = ImageDraw.Draw(img)

    # glow top + accent bar
    glow = Image.new("L", (SW_, SH_), 0)
    ImageDraw.Draw(glow).ellipse([SW_ - 800, -500, SW_ + 400, 700], fill=70)
    img.paste(Image.new("RGB", (SW_, SH_), pal["container"]), (0, 0), glow)

    brand_font = _font("Bricolage.ttf", 56, 750)
    draw.text((84, 96), "Zauberkoch", font=brand_font, fill=pal["primary"])
    sub_font = _font("Inter.ttf", 34, 500)
    draw.text((84, 168), "Dein KI-Koch", font=sub_font, fill=tuple(min(c + 70, 255) for c in pal["on"]))

    # motif stage
    motif = motif_for_recipe(recipe, mode)
    mp = MOTIF_DIR / f"{motif}.png"
    cx, cy = SW_ // 2, 700
    overlay = Image.new("RGBA", (SW_, SH_), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.ellipse([cx - 400, cy - 400, cx + 400, cy + 400], fill=(*pal["container"], 110))
    odraw.ellipse([cx - 330, cy - 330, cx + 330, cy + 330], fill=(*pal["container"], 170))
    img.alpha_composite(overlay)
    if mp.exists():
        art = Image.open(mp).convert("RGBA").resize((660, 660), Image.LANCZOS)
        img.alpha_composite(art, (cx - 330, cy - 330))

    draw = ImageDraw.Draw(img)
    y = 1180
    kueche_font = _font("Inter.ttf", 40, 650)
    label = (recipe.get("kueche") or "").upper()
    lw = draw.textlength(label, font=kueche_font)
    draw.text(((SW_ - lw) // 2, y), label, font=kueche_font, fill=pal["primary"])
    y += 84

    title_font = _font("Bricolage.ttf", 92, 750)
    for line in _wrap(draw, recipe.get("titel", ""), title_font, SW_ - 160, 3):
        tw = draw.textlength(line, font=title_font)
        draw.text(((SW_ - tw) // 2, y), line, font=title_font, fill=pal["on"])
        y += 106

    # centered stat pills
    pill_font = _font("Inter.ttf", 38, 550)
    stats: list[str] = []
    if recipe.get("zeit_gesamt"):
        stats.append(_fmt_min(int(recipe["zeit_gesamt"])))
    if recipe.get("schwierigkeit"):
        stats.append(str(recipe["schwierigkeit"]))
    if stats:
        y += 24
        widths = [int(draw.textlength(t_, font=pill_font)) + 2 * 30 for t_ in stats]
        total = sum(widths) + 20 * (len(stats) - 1)
        px = (SW_ - total) // 2
        for stat, w in zip(stats, widths):
            draw.rounded_rectangle([px, y, px + w, y + 38 + 36], radius=(38 + 36) // 2, fill=pal["container"])
            draw.text((px + 30, y + 16), stat, font=pill_font, fill=pal["primary"])
            px += w + 20

    footer_font = _font("Bricolage.ttf", 48, 700)
    footer = "zauberkoch.de"
    fw = draw.textlength(footer, font=footer_font)
    draw.text(((SW_ - fw) // 2, SH_ - 160), footer, font=footer_font, fill=pal["primary"])
    hint_font = _font("Inter.ttf", 32, 450)
    hint = "Rezept ansehen & nachkochen"
    hw = draw.textlength(hint, font=hint_font)
    draw.text(((SW_ - hw) // 2, SH_ - 96), hint, font=hint_font, fill=tuple(min(c + 70, 255) for c in pal["on"]))

    return img.convert("RGB")


def story_png_path(token: str) -> Path:
    settings = get_settings()
    og_dir = settings.db_path.parent / "og"
    og_dir.mkdir(parents=True, exist_ok=True)
    return og_dir / f"{token}-story-v{STYLE_VERSION}.png"


def get_or_render_story(token: str, recipe: dict, mode: str) -> Path:
    path = story_png_path(token)
    if not path.exists():
        render_story(recipe, mode).save(path, "PNG", optimize=True)
    return path


def og_png_path(token: str) -> Path:
    settings = get_settings()
    og_dir = settings.db_path.parent / "og"
    og_dir.mkdir(parents=True, exist_ok=True)
    return og_dir / f"{token}-v{STYLE_VERSION}.png"


def get_or_render(token: str, recipe: dict, mode: str) -> Path:
    path = og_png_path(token)
    if not path.exists():
        render_og(recipe, mode).save(path, "PNG", optimize=True)
    return path


def evict(token: str) -> None:
    og_png_path(token).unlink(missing_ok=True)
    story_png_path(token).unlink(missing_ok=True)
    (og_png_path(token).parent / f"{token}.png").unlink(missing_ok=True)  # pre-v2 cache
