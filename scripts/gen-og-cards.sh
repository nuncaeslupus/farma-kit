#!/usr/bin/env bash
# Regenerate the localized OpenGraph link-preview cards (1200×630) in public/,
# one per language, from the app's OWN fonts + Hygieia mark. This script is the
# source of truth for those PNGs (the originals' source was never committed) —
# edit the text/layout here and re-run `make og-cards`, then commit the PNGs.
#
# Output: public/og-card.png (es, the default) and public/og-card-<lang>.png.
# Each shell's og:image/twitter:image/JSON-LD image must point at its own card.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC="$ROOT/public"
FONTS="file://$PUBLIC/fonts"

# Headless Chrome renders the card; accept either common binary name.
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "$CHROME" ] || { echo "error: need google-chrome or chromium on PATH" >&2; exit 1; }

# Inline the mark SVGs — headless Chrome will not load them via file:// mask-image.
# CSS `fill` on the paths overrides their fill="#000" presentation attribute.
SNAKE_SVG="$(cat "$PUBLIC/brand/farmakit-snake.svg")"
BOWL_SVG="$(cat "$PUBLIC/brand/farmakit-bowl.svg")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# lang | out-filename | headline (accent) | sub (muted) | tagline (muted).
# headline+sub mirror each shell's appTitle; tagline is the privacy one-liner.
render() {
  local lang="$1" outfile="$2" headline="$3" sub="$4" tagline="$5"
  local html="$WORK/card-$lang.html"
  cat > "$html" <<HTML
<!doctype html><html lang="$lang"><head><meta charset="utf-8"><style>
@font-face{font-family:'Space Grotesk';font-weight:600;src:url('$FONTS/space-grotesk-latin-600-normal.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans';font-weight:400;src:url('$FONTS/ibm-plex-sans-latin-400-normal.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans';font-weight:600;src:url('$FONTS/ibm-plex-sans-latin-600-normal.woff2') format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px}
.card{width:1200px;height:630px;background:#f4efe6;display:flex;align-items:center;gap:66px;padding:0 92px}
.mark{position:relative;width:212px;height:212px;flex:none}
.mark>div{position:absolute;inset:0}
.mark svg{width:100%;height:100%}
.snake svg path{fill:#0f5d5c}
.bowl svg path{fill:#201d18}
.col{display:flex;flex-direction:column}
.wm{font-family:'Space Grotesk';font-weight:600;font-size:70px;letter-spacing:-.02em;color:#201d18;line-height:1;margin-bottom:22px}
.wm b{color:#0f5d5c;font-weight:600}
.hl{font-family:'IBM Plex Sans';font-weight:600;font-size:45px;line-height:1.14;color:#0f5d5c;max-width:640px}
.sub{font-family:'IBM Plex Sans';font-weight:400;font-size:33px;color:#6d665a;margin-top:8px}
.tag{font-family:'IBM Plex Sans';font-weight:400;font-size:26px;line-height:1.32;color:#6d665a;margin-top:28px;max-width:600px}
</style></head><body><div class="card">
<div class="mark"><div class="snake">$SNAKE_SVG</div><div class="bowl">$BOWL_SVG</div></div>
<div class="col">
<div class="wm">Farma<b>Kit</b></div>
<div class="hl">$headline</div>
<div class="sub">$sub</div>
<div class="tag">$tagline</div>
</div></div></body></html>
HTML
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --allow-file-access-from-files \
    --window-size=1200,630 --virtual-time-budget=3000 \
    --screenshot="$PUBLIC/$outfile" "file://$html" 2>/dev/null
  echo "wrote public/$outfile"
}

render es og-card.png    "Rellenador de hojas de cupones precinto" "para la receta electrónica" \
  "Gratis · Sin registro · Los datos no salen de tu navegador"
render ca og-card-ca.png "Emplenador de fulls de cupons precinte" "per a la recepta electrònica" \
  "Gratuït · Sense registre · Les dades no surten del navegador"
render eu og-card-eu.png "Zigilu-kupoien orriak betetzeko tresna" "errezeta elektronikorako" \
  "Doan · Izena eman gabe · Datuak ez dira nabigatzailetik ateratzen"
render gl og-card-gl.png "Enchedor de follas de cupóns precinto" "para a receita electrónica" \
  "De balde · Sen rexistro · Os datos non saen do navegador"
