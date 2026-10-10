"""Compose the README's hero image — the form in, the coupon-sheet header out.

Not shipped code. Writes docs/hero.svg, then rasterises it to docs/hero.png with a
headless Chromium (the README shows the PNG: GitHub's `<img>` view of an SVG loads
no fonts). Set in the app's own fonts from public/fonts and drawn around its mark
(public/favicon.svg); needs Pillow to crop the screenshot.

Same drafting-sheet family as the author's other repos. The form values are the
screenshot's fictional pharmacy; no counts or versions on the sheet.

Usage, from the repository root:

    make hero
"""

from __future__ import annotations

import base64
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
        text(68, 182, "Fills in Spanish pharmacy coupon sheets, in seconds.", size=25, fill=SOFT),
        text(
            68,
            210,
            "The header of the hojas de cupones precinto, for the electronic prescription.",
            size=15,
            fill=DIM,
        ),
    ]


def title_block() -> list[str]:
    x, y, w, h = 842, 62, 376, 64
    half = w / 2 - 20
    cells = [(0.0, "RUNS IN", "your browser"), (half, "OUTPUT", "a PDF to print")]
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{GROUND}" stroke="{FRAME}" '
        f'stroke-width="1.2"/>',
        f'<line x1="{x}" y1="{y + h / 2 + 4}" x2="{x + w}" y2="{y + h / 2 + 4}" stroke="{FRAME}"/>',
        f'<line x1="{x + half}" y1="{y + h / 2 + 4}" x2="{x + half}" y2="{y + h}" '
        f'stroke="{FRAME}"/>',
        text(x + 10, y + 14, "PROJECT", size=8, fill=DIM, family=MONO, spacing=1.5),
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
        caption(x, y - 12, "THE FORM"),
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{CARD}" stroke="{FRAME}"/>',
    ]
    fx, half = x + 18, (w - 36 - 12) / 2
    out += field(fx, y + 26, w - 36, "Col·legi de farmacèutics", "Girona")
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
        text(x + 27, y + 96, "made in your", size=11.5, fill=DIM, anchor="middle"),
        text(x + 27, y + 112, "browser", size=11.5, fill=DIM, anchor="middle"),
    ]


def sheet(x: float, y: float, top: bool) -> list[str]:
    """One coupon sheet: the official printed grid, and the header FarmaKit fills in."""
    w, h = 300, 262
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="{FRAME}"/>',
    ]
    if not top:
        return out
    # The official, pre-printed part: a header frame and the coupon slots.
    out += [
        f'<rect x="{x + 12}" y="{y + 12}" width="{w - 24}" height="66" fill="none" '
        f'stroke="{FRAME}" stroke-width="0.8"/>',
        f'<line x1="{x + 186}" y1="{y + 12}" x2="{x + 186}" y2="{y + 78}" stroke="{FRAME}" '
        f'stroke-width="0.8"/>',
    ]
    for j in range(4):
        for i in range(5):
            out.append(
                f'<rect x="{x + 12 + i * 55.2}" y="{y + 90 + j * 40}" width="49" height="34" '
                f'rx="2" fill="none" stroke="#cfc7b8" stroke-dasharray="3 2"/>'
            )
    # What FarmaKit prints on top of it.
    printed = [("UP 12345", 0), ("07/2026", 1), ("Hoja 1 de 50", 2)]
    for s, i in printed:
        out.append(text(x + 22, y + 32 + i * 18, s, size=12, family=MONO, weight=600, fill=TEAL))
    stamp = ["Rubinat i Perfumat", "C/ Poltergeist, 5", "17001 Girona"]
    for i, s in enumerate(stamp):
        out.append(text(x + 192, y + 32 + i * 16, s, size=8.4, family=MONO, fill=TEAL))
    return out


def sheets() -> list[str]:
    x, y = 664, 262
    out = [caption(x + 20, y - 12, "THE COUPON SHEET")]
    out += sheet(x + 40, y + 16, False) + sheet(x + 20, y + 8, False) + sheet(x, y, True)
    out += [
        f'<line x1="{x + 350}" y1="{y + 44}" x2="{x + 400}" y2="{y + 44}" stroke="{TEAL}" '
        f'stroke-width="1.2"/>',
        f'<circle cx="{x + 350}" cy="{y + 44}" r="3" fill="{TEAL}"/>',
        text(x + 408, y + 40, "printed by", size=12, fill=TEAL, weight=600),
        text(x + 408, y + 56, "FarmaKit", size=12, fill=TEAL, weight=600),
        f'<line x1="{x + 300}" y1="{y + 170}" x2="{x + 400}" y2="{y + 170}" stroke="{DIM}" '
        f'stroke-width="1.2"/>',
        f'<circle cx="{x + 300}" cy="{y + 170}" r="3" fill="{DIM}"/>',
        text(x + 408, y + 166, "the official", size=12, fill=DIM),
        text(x + 408, y + 182, "sheet, from", size=12, fill=DIM),
        text(x + 408, y + 198, "your wholesaler", size=12, fill=DIM),
    ]
    return out


def strip() -> list[str]:
    items = [
        ("private", "nothing uploaded, no cookies"),
        ("per col·legi", "each layout traced from a real sheet"),
        ("remembers", "your data stays in this browser"),
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
