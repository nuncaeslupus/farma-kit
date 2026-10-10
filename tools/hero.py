"""Compose the README's hero image — the form in, the coupon-sheet header out.

Not shipped code. Writes docs/hero.svg, then rasterises it to docs/hero.png with a
headless Chromium (the README shows the PNG: GitHub's `<img>` view of an SVG loads
no fonts). Set in the app's own fonts from public/fonts and drawn around its mark
(public/favicon.svg); needs Pillow to crop the screenshot.

Same drafting-sheet family as the author's other repos. The coupon sheet is the
real Barcelona one (docs/hero-sheet.png, cropped once from the col·legi's PDF),
printed in a muted tone; the teal values are each template field's own sample,
placed at the template's own boxes. No counts or versions on it.

Usage, from the repository root:

    make hero
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public" / "fonts"
MARK_SVG = ROOT / "public" / "favicon.svg"
OUT_SVG = ROOT / "docs" / "hero.svg"
OUT_PNG = ROOT / "docs" / "hero.png"

#: The GitHub social-preview size, which the README shows scaled to its column.
W, H = 1280, 640

GROUND = "#f3efe7"  # the og card's
GRID = "#e6e0d4"
INK = "#201d18"  # the mark's bowl
SOFT = "#4a443b"
DIM = "#7a7266"
FRAME = "#a39a8b"
CARD = "#fbf9f4"
TEAL = "#0f5d5c"  # the mark's snake
SANS = "'IBM Plex Sans', Inter, sans-serif"
DISPLAY = "'Space Grotesk', Inter, sans-serif"
MONO = "'IBM Plex Mono', 'DejaVu Sans Mono', monospace"

FONT_FACES = [
    ("IBM Plex Sans", 400, "normal", "ibm-plex-sans-latin-400-normal.woff2"),
    ("IBM Plex Sans", 400, "italic", "ibm-plex-sans-latin-400-italic.woff"),
    ("IBM Plex Sans", 600, "normal", "ibm-plex-sans-latin-600-normal.woff2"),
    ("IBM Plex Sans", 700, "normal", "ibm-plex-sans-latin-700-normal.woff2"),
    ("IBM Plex Mono", 400, "normal", "ibm-plex-mono-latin-400-normal.woff2"),
    ("IBM Plex Mono", 600, "normal", "ibm-plex-mono-latin-600-normal.woff2"),
    ("Space Grotesk", 600, "normal", "space-grotesk-latin-600-normal.woff2"),
    ("Space Grotesk", 700, "normal", "space-grotesk-latin-700-normal.woff2"),
]


def text(
    x: float,
    y: float,
    s: str,
    *,
    size: float,
    fill: str = INK,
    family: str = SANS,
    weight: int = 400,
    anchor: str = "start",
    spacing: float = 0,
    italic: bool = False,
) -> str:
    style = ' font-style="italic"' if italic else ""
    return (
        f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" '
        f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" '
        f'letter-spacing="{spacing}"{style} xml:space="preserve">{escape(s)}</text>'
    )


def drafting_sheet() -> list[str]:
    """Grid, border with zone marks, registration marks — the family's drafting sheet."""
    out = [f'<rect width="{W}" height="{H}" fill="{GROUND}"/>']
    for x in range(0, W, 20):
        width = 0.9 if x % 100 == 0 else 0.4
        out.append(
            f'<line x1="{x}" y1="0" x2="{x}" y2="{H}" stroke="{GRID}" stroke-width="{width}"/>'
        )
    for y in range(0, H, 20):
        width = 0.9 if y % 100 == 0 else 0.4
        out.append(
            f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="{GRID}" stroke-width="{width}"/>'
        )
    out.append(
        f'<rect x="16" y="16" width="{W - 32}" height="{H - 32}" fill="none" stroke="{GRID}"/>'
    )
    out.append(
        f'<rect x="30" y="30" width="{W - 60}" height="{H - 60}" fill="none" '
        f'stroke="{FRAME}" stroke-width="1.5"/>'
    )
    zw = (W - 60) / 8
    for i in range(8):
        x = 30 + zw * i
        if i:
            out.append(f'<line x1="{x}" y1="16" x2="{x}" y2="30" stroke="{FRAME}"/>')
            out.append(f'<line x1="{x}" y1="{H - 30}" x2="{x}" y2="{H - 16}" stroke="{FRAME}"/>')
        for y in (27, H - 19):
            out.append(
                text(x + zw / 2, y, str(8 - i), size=9, fill=DIM, family=MONO, anchor="middle")
            )
    zh = (H - 60) / 4
    for i in range(4):
        y = 30 + zh * i
        if i:
            out.append(f'<line x1="16" y1="{y}" x2="30" y2="{y}" stroke="{FRAME}"/>')
            out.append(f'<line x1="{W - 30}" y1="{y}" x2="{W - 16}" y2="{y}" stroke="{FRAME}"/>')
        for x in (23, W - 23):
            out.append(
                text(x, y + zh / 2 + 3, "ABCD"[i], size=9, fill=DIM, family=MONO, anchor="middle")
            )
    for cx, cy in ((48, 48), (48, H - 48)):
        out += [
            f'<circle cx="{cx}" cy="{cy}" r="7" fill="none" stroke="{TEAL}"/>',
            f'<line x1="{cx - 11}" y1="{cy}" x2="{cx + 11}" y2="{cy}" stroke="{TEAL}"/>',
            f'<line x1="{cx}" y1="{cy - 11}" x2="{cx}" y2="{cy + 11}" stroke="{TEAL}"/>',
        ]
    return out


def mark(x: float, y: float, size: float) -> str:
    data = base64.b64encode(MARK_SVG.read_bytes()).decode()
    return (
        f'<image x="{x}" y="{y}" width="{size}" height="{size}" '
        f'href="data:image/svg+xml;base64,{data}"/>'
    )


def wordmark() -> list[str]:
    return [
        mark(50, 38, 112),
        f'<text x="170" y="122" font-family="{DISPLAY}" font-size="78" font-weight="600" '
        f'letter-spacing="-1.5"><tspan fill="{INK}">Farma</tspan>'
        f'<tspan fill="{TEAL}">Kit</tspan></text>',
        text(68, 182, "Rellena las hojas de cupones precinto en segundos.", size=25, fill=SOFT),
        text(
            68,
            210,
            "La cabecera de la receta electrónica, impresa sobre la hoja oficial. "
            "Desde tu navegador.",
            size=15,
            fill=DIM,
        ),
    ]


def title_block() -> list[str]:
    x, y, w, h = 842, 62, 376, 64
    half = w / 2 - 20
    cells = [(0.0, "FUNCIONA EN", "tu navegador"), (half, "RESULTADO", "un PDF para imprimir")]
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{GROUND}" stroke="{FRAME}" '
        f'stroke-width="1.2"/>',
        f'<line x1="{x}" y1="{y + h / 2 + 4}" x2="{x + w}" y2="{y + h / 2 + 4}" stroke="{FRAME}"/>',
        f'<line x1="{x + half}" y1="{y + h / 2 + 4}" x2="{x + half}" y2="{y + h}" '
        f'stroke="{FRAME}"/>',
        text(x + 10, y + 14, "PROYECTO", size=8, fill=DIM, family=MONO, spacing=1.5),
        text(x + 10, y + 31, "farma-kit", size=15, weight=600, family=MONO),
    ]
    for cx, label, value in cells:
        out.append(text(x + cx + 10, y + 47, label, size=8, fill=DIM, family=MONO, spacing=1.5))
        out.append(
            text(x + cx + 10, y + 61, value, size=11.5, family=MONO, fill=TEAL if cx else INK)
        )
    return out


def caption(x: float, y: float, s: str) -> str:
    return text(x, y, s, size=10, fill=TEAL, family=MONO, spacing=2, weight=600)


def field(
    x: float, y: float, w: float, label: str, value: str, *, right: bool = False
) -> list[str]:
    return [
        text(x, y, label, size=11, fill=DIM, weight=600),
        f'<rect x="{x}" y="{y + 6}" width="{w}" height="26" rx="4" fill="#ffffff" '
        f'stroke="{FRAME}"/>',
        text(
            x + (w - 10 if right else 10),
            y + 24,
            value,
            size=12.5,
            fill=INK,
            anchor="end" if right else "start",
        ),
    ]


def form() -> list[str]:
    x, y, w, h = 64, 262, 420, 262
    out = [
        caption(x, y - 12, "EL FORMULARIO"),
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{CARD}" stroke="{FRAME}"/>',
    ]
    fx, half = x + 18, (w - 36 - 12) / 2
    out += field(fx, y + 26, w - 36, "Colegio de Farmacéuticos", "Barcelona")
    out.append(
        f'<path d="M{fx + w - 58},{y + 43} l5,5 l5,-5" fill="none" stroke="{SOFT}" '
        f'stroke-width="1.4"/>'
    )
    out += field(fx, y + 80, half, "UP de la farmacia", "12345", right=True)
    out += field(fx + half + 12, y + 80, half, "Mes y año", "julio de 2026")
    out += field(fx, y + 134, half, "Hojas", "1 → 50", right=True)
    out += field(fx + half + 12, y + 134, half, "Titular", "Rubinat i Perfumat")
    by = y + h - 54
    out += [
        f'<rect x="{fx}" y="{by + 10}" width="14" height="14" rx="3" fill="{TEAL}"/>',
        f'<path d="M{fx + 3.5},{by + 17.5} l2.6,2.6 l4.6,-5.4" fill="none" stroke="#fff" '
        f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
        text(fx + 22, by + 22, "Recuérdame", size=12.5, fill=INK),
        f'<rect x="{x + w - 188}" y="{by}" width="170" height="34" rx="6" fill="{TEAL}"/>',
        text(
            x + w - 103,
            by + 22,
            "Generar documento",
            size=13,
            weight=600,
            fill="#ffffff",
            anchor="middle",
        ),
    ]
    return out


def pdf_badge() -> list[str]:
    x, y = 540, 352
    return [
        f'<line x1="494" y1="{y + 34}" x2="{x - 8}" y2="{y + 34}" stroke="{TEAL}" '
        f'stroke-width="1.6" stroke-dasharray="5 3"/>',
        f'<path d="M{x},{y} h40 l14,14 v54 h-54 z" fill="#ffffff" stroke="{TEAL}" '
        f'stroke-width="1.6"/>',
        f'<path d="M{x + 40},{y} v14 h14" fill="none" stroke="{TEAL}" stroke-width="1.6"/>',
        text(x + 27, y + 50, "PDF", size=12, weight=600, family=MONO, fill=TEAL, anchor="middle"),
        f'<line x1="{x + 62}" y1="{y + 34}" x2="{x + 112}" y2="{y + 34}" stroke="{TEAL}" '
        f'stroke-width="1.6" stroke-dasharray="5 3"/>',
        f'<path d="M{x + 106},{y + 28} L{x + 114},{y + 34} L{x + 106},{y + 40}" fill="none" '
        f'stroke="{TEAL}" stroke-width="1.6"/>',
        text(x + 27, y + 96, "hecho en tu", size=11.5, fill=DIM, anchor="middle"),
        text(x + 27, y + 112, "navegador", size=11.5, fill=DIM, anchor="middle"),
    ]


#: The real Barcelona coupon sheet, cropped to its header and first coupon rows
#: (rendered once from the col·legi's PDF; see docs/hero-sheet.png).
SHEET_PNG = ROOT / "docs" / "hero-sheet.png"
SHEET_TEMPLATE = ROOT / "public" / "templates" / "catalunya.json"
#: The values printed on it: each template field's own sample, page 1 instead of 5.
SAMPLE_OVERRIDES = {"page": "0001"}
TEMPLATE_TONE = (150, 141, 128)  # the official sheet, printed in a muted warm grey


def tinted_sheet() -> tuple[str, float, float]:
    """The sheet crop as a data URI, its black ink recoloured to the template tone."""
    import io

    from PIL import Image, ImageOps  # type: ignore[import-not-found, unused-ignore]

    with Image.open(SHEET_PNG) as im:
        grey = im.convert("L")
        tinted = ImageOps.colorize(grey, black=TEMPLATE_TONE, white=(255, 255, 255))
        buf = io.BytesIO()
        tinted.save(buf, format="PNG", optimize=True)
        size = grey.size
    return base64.b64encode(buf.getvalue()).decode(), size[0], size[1]


def printed(x0: float, y0: float, k: float) -> list[str]:
    """What FarmaKit prints, at the template's own boxes (PDF points, scaled by k)."""
    template = json.loads(SHEET_TEMPLATE.read_text())
    out = []
    for f in template["fields"]:
        value = SAMPLE_OVERRIDES.get(f["key"], f.get("sample", ""))
        box, style = f["box"], f["style"]
        family = MONO if style["font"] == "mono" else SANS
        weight = 700 if style["bold"] else 400
        size = style["size"] * k
        bx, by, bw, bh = (x0 + box["x"] * k, y0 + box["y"] * k, box["w"] * k, box["h"] * k)
        base = by + bh / 2 + size * 0.36
        cells = f.get("cells", 1)
        if cells > 1:
            # One character per pre-printed cell, centred in it.
            cw = bw / cells
            for i, ch in enumerate(value[:cells]):
                out.append(
                    text(
                        bx + cw * (i + 0.5),
                        base,
                        ch,
                        size=size,
                        family=family,
                        weight=weight,
                        fill=TEAL,
                        anchor="middle",
                    )
                )
            continue
        anchor = {"left": "start", "right": "end"}.get(style["halign"], "middle")
        tx = {"start": bx + 2, "end": bx + bw - 2}.get(anchor, bx + bw / 2)
        out.append(
            text(tx, base, value, size=size, family=family, weight=weight, fill=TEAL, anchor=anchor)
        )
    return out


def sheets() -> list[str]:
    x, y, w = 664, 262, 420
    data, pw, ph = tinted_sheet()
    k = w / 594.96  # PDF points to sheet pixels on the hero
    h = w * ph / pw
    out = [caption(x + 20, y - 12, "LA HOJA DE CUPONES · BARCELONA")]
    for dx in (24, 12):
        out.append(
            f'<rect x="{x + dx}" y="{y + dx / 2}" width="{w}" height="{h}" fill="#ffffff" '
            f'stroke="{FRAME}"/>'
        )
    out += [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="{FRAME}"/>',
        f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{data}"/>',
        '<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>'
        '<stop offset="1" stop-color="#ffffff" stop-opacity="1"/></linearGradient></defs>',
        f'<rect x="{x + 1}" y="{y + h - 40}" width="{w - 2}" height="39" fill="url(#fade)"/>',
    ]
    out += printed(x, y, k)
    lx = x + w + 34
    out += [
        f'<line x1="{x + 553 * k + 2}" y1="{y + 40}" x2="{lx - 6}" y2="{y + 40}" '
        f'stroke="{TEAL}" stroke-width="1.2"/>',
        f'<circle cx="{x + 553 * k + 2}" cy="{y + 40}" r="3" fill="{TEAL}"/>',
        text(lx, y + 36, "lo imprime", size=12, fill=TEAL, weight=600),
        text(lx, y + 52, "FarmaKit", size=12, fill=TEAL, weight=600),
        f'<line x1="{x + w - 30}" y1="{y + 170}" x2="{lx - 6}" y2="{y + 170}" stroke="{DIM}" '
        f'stroke-width="1.2"/>',
        f'<circle cx="{x + w - 30}" cy="{y + 170}" r="3" fill="{DIM}"/>',
        text(lx, y + 166, "la hoja", size=12, fill=DIM),
        text(lx, y + 182, "oficial, del", size=12, fill=DIM),
        text(lx, y + 198, "mayorista", size=12, fill=DIM),
    ]
    return out


def strip() -> list[str]:
    items = [
        ("privado", "nada sale de tu navegador, sin cookies"),
        ("por colegio", "cada plantilla, calcada de una hoja real"),
        ("recuérdame", "tus datos se quedan en este navegador"),
    ]
    x0, y, w, h, gap = 64, 556, 376, 40, 9
    out = []
    for i, (name, sub) in enumerate(items):
        x = x0 + i * (w + gap)
        out += [
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{CARD}" '
            f'stroke="{FRAME}" stroke-width="0.8"/>',
            f'<rect x="{x}" y="{y}" width="4" height="{h}" rx="2" fill="{TEAL}"/>',
            text(x + 16, y + 25, name, size=12.5, weight=600, family=MONO, fill=TEAL),
            text(x + 16 + len(name) * 7.8 + 10, y + 25, sub, size=12.5, fill=SOFT),
        ]
    return out


def svg() -> str:
    parts = drafting_sheet() + wordmark() + title_block() + form() + pdf_badge() + sheets()
    parts += strip()
    body = "\n  ".join(parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}">\n  {body}\n</svg>\n'
    )


def font_css() -> str:
    rules = [
        f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:{style};"
        f"src:url('{(FONTS / name).as_uri()}')}}"
        for family, weight, style, name in FONT_FACES
    ]
    return "".join(rules)


def chromium() -> str:
    for candidate in (
        os.environ.get("CHROMIUM"),
        "/opt/pw-browsers/chromium",
        shutil.which("chromium"),
        shutil.which("google-chrome"),
    ):
        if candidate and Path(candidate).exists():
            return candidate
    sys.exit("hero: no Chromium found; set CHROMIUM=/path/to/chrome")


def main() -> None:
    OUT_SVG.write_text(svg())
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "hero.html"
        page.write_text(
            f"<html><head><style>{font_css()}</style></head>"
            f'<body style="margin:0;overflow:hidden">{svg()}</body></html>'
        )
        subprocess.run(
            [
                chromium(),
                "--headless=new",
                "--no-sandbox",
                "--allow-file-access-from-files",
                "--hide-scrollbars",
                "--force-device-scale-factor=2",
                f"--window-size={W},{H + 200}",
                f"--screenshot={OUT_PNG}",
                page.as_uri(),
            ],
            check=True,
            capture_output=True,
        )
    # Headless Chromium's viewport is shorter than its window: shoot tall, then crop.
    from PIL import Image  # type: ignore[import-not-found, unused-ignore]

    with Image.open(OUT_PNG) as shot:
        shot.crop((0, 0, W * 2, H * 2)).save(OUT_PNG, optimize=True)
    print(f"wrote {OUT_SVG.relative_to(ROOT)} and {OUT_PNG.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
