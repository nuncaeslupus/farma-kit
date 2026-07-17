# Handoff

Maintainer notes for [Farma-Kit](../README.md). The README is for people *using*
the app; this is everything you need to *work on* it — architecture, the sheet
templates, the editor, the traps that have already bitten, and where things stand.

## Architecture

Vite + Lit + TypeScript. No backend, no state management, no router library.

```
src/main.ts            entry
src/app-root.ts        hash router: default → generator, #editor → editor (dev only)
src/generator/         the pharmacy-facing form (light DOM, global app.css)
src/editor/            the template editor (shadow DOM components)
src/lib/               template model, colegios, i18n, validation, pdf/
public/templates/      the sheet geometry (see below)
```

`base` is `/farma-kit/` (see `vite.config.ts`) so the GitHub Pages project-site
URL resolves even without a trailing slash.

**The editor never ships.** `app-root.ts` imports it behind
`if (import.meta.env.DEV)`, which is statically false in a production build, so
the bundler drops it entirely — the deployed site has no `#editor` route. Keep
maintainer-only code on that side of the line. It is also why the editor sets
`document.title` itself rather than the router doing it: `app-root.ts` ships, and
`index.html`'s title is the indexed one.

## Templates

Each col·legi maps to a template JSON describing its sheet geometry — where each
field sits, in points, on the page:

```
public/templates/index.json      colegio slug → template slug
public/templates/<slug>.json     the sheet geometry itself
```

The Catalan colegios (Barcelona, Girona, Lleida, Tarragona) all map to a single
`catalunya.json`, because one physical sheet covers all four. The template also
carries the National Code printed on the sheet (`cn`) and whether the stamp
section (`segell`) applies, so those follow the col·legi automatically.

Fields are **open by design**: each one carries its own `key` and `label` rather
than coming from a fixed list, since colegios we haven't seen yet may need fields
we can't foresee. See `src/lib/template.ts`.

`src/lib/colegios.ts` holds the canonical list of colegios, grouped by autonomous
community.

Box coordinates are **y-from-top**, in points, against the sheet size recorded in
`sheet: { w, h }`.

### Long values

Text is wrapped to the field's box width and, if the wrapped block is still
taller than the box, the font shrinks (down to 4 pt) rather than spilling into
the field below. The titular breaks at its comma — surnames above, name below —
and never splits the name itself. So when designing a template, give a field the
box you want and the `valign` that matches its safe growth direction: `top` grows
downward, `bottom` pins the last line to the box's bottom edge and grows *upward*
(what `cpCity`/`province` use, so a long city cannot spill below the printed box).

## Official sheet PDFs

The col·legi supplies pharmacies with the sheet artwork as a PDF, so obtaining one
is a matter of asking — Barcelona's is `MOD_00013.pdf`.

**They live in `sheets/`, which is gitignored.** They are the col·legi's documents
and `public/` is world-served from GitHub Pages, so they stay out of the repo. The
editor takes the sheet as a runtime upload, so nothing needs it committed. Keep
them named per template, e.g. `sheets/catalunya_MOD_00013.pdf`.

The app deliberately prints **only the data, never the sheet**. Pharmacies *can*
legitimately print their own sheets from the col·legi's PDF — that was checked,
it is not a controlled-stock problem — so "print both" is technically possible.
It stays out because the one-line promise "we only print your data" is the whole
trust story, and the alternative is that promise plus a paragraph of caveats. If
a col·legi ever asks for it in writing, it becomes their call.

## Adding a col·legi

Templates are traced from the sheet, so this needs the col·legi's sheet PDF (or a
scan of a real sheet) in hand:

1. `npm run dev`, then open
   [localhost:5173/farma-kit/#editor](http://localhost:5173/farma-kit/#editor) —
   the visual template editor.
2. **Upload PDF…** the official sheet, then place the fields over it. In the
   **Template** panel set the **Template name** — that is the template *id*, not a
   colegio: it becomes `templates/<slug>.json`, and one template can serve several
   colegios (as `catalunya.json` serves four). Set the **National Code** if the
   sheet carries one.
3. **Generate test PDF** to check the result. Untick **Include official sheet** to
   see the data-only overlay — that is what actually prints onto the paper; with
   it ticked you are checking alignment against the sheet.
4. **Export JSON** → `public/templates/<slug>.json`. Export is **blocked** if the
   template is invalid (malformed CN, blank or duplicate field key, box off the
   sheet, zero sizes) and tells you why — an exported file drives real printing,
   so a bad one is worse than no file.
5. Point the colegio at it in `public/templates/index.json`.
6. **Verify against a printed sheet before shipping.** Geometry that looks right
   on screen can still be off on paper.

The editor round-trips `cn` and `segell` even though only `cn` has a control:
importing a hand-written template and re-exporting it returns byte-identical
JSON. It did not always — an early re-export silently dropped `cn`, which hides
the national-code line in the app entirely.

### Editor reference

| | |
|---|---|
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z (also Ctrl+Y), or the `↶ ↷` arrows. 50 steps, fields only. |
| Constrain a drag | Hold **Shift** — locks to whichever axis has moved further, decided live, so pressing Shift mid-drag keeps the direction you were already going. |
| Nudge | Arrow keys (1 pt), Shift+Arrow (10 pt). |
| Zoom | **Fit page** / **Fit width**, or ±. |
| Snap | *Snap to other fields* aligns to neighbours' edges; a Shift-locked axis ignores it. |

Undo tracks the **field list only**, so importing a template clears the stacks —
stepping across an import would graft the old sheet's boxes onto the new sheet's
name and CN.

## The Catalunya template

`catalunya.json` (CN `140663.7`) was re-traced in July 2026 from the col·legi's
original artwork, `MOD_00013.pdf` — a Photoshop export dated 2013–14, not a scan,
so its geometry is authoritative and needs no registration correction.

The previous template came from the predecessor Apps Script project and was off:
its field *centres* fitted `template_x = 0.9843 × sheet_x + 7.79` (residuals
< 0.2 pt — a 1.57% shrink) and everything sat 9.74 pt too low, while the box
*widths* followed no consistent ratio at all (0.875–1.046). A uniform shrink plus
an offset, with hand-drawn boxes, is the signature of tracing from a photocopy or
a printed test page rather than the original file. The sheet itself never changed:
the comb structure still has the same 5/2/2/4 cells.

Useful measurements from the artwork, should you ever need to re-derive it — the
comb cells are printed in **light grey (≈204), not black**, which will defeat a
naive threshold:

```
comb cells   y 45.84 .. 64.80        (all four share one baseline)
up           x  39.48 .. 130.44      5 cells
month        x 147.48 .. 181.32      2 cells
year         x 193.44 .. 227.40      2 cells
page         x 249.48 .. 318.48      4 cells
data box     x 399.00 .. 563.04      y 34.80 .. 129.60   (empty rectangle — the
                                     five data fields only need to sit inside it)
```

**The shipped file carries a printer fudge:** the four combs sit 1.72 pt above the
true sheet, added to compensate for a rotation in one printer's paper feed. It is
within tolerance (a 19 pt cell holds a ~12.6 pt digit), but it is a *translation*
applied to a *rotation*, which re-centres the average error rather than removing
it — and it biases a template four colegios share toward one printer. If
alignment complaints ever arrive, that 1.72 pt is the first thing to question;
printer offsets belong at print time, not baked per-field.

## Tests

Vitest + jsdom, ~115 tests in `tests/`.

One rule matters: **tests import the real source, never a copy of it.** The
predecessor repo's suite mirrored the functions under test into the test file —
it stayed green while the shipped code broke, and even tested a `validators`
object that existed nowhere in `src/`. So anything worth testing has to be
importable without side effects, which is why:

- the bug-prone form logic (`isNif`, `CP2PROV`, `titleCase`, the field rules, the
  ca/es language default) lives in `src/lib/validation.ts`, not inside
  `generator-app.ts` — a Lit element that registers a custom element and touches
  the DOM on import;
- the PDF line-breaking lives in `src/lib/pdf/wrap.ts`, apart from `generate.ts`,
  which pulls in pdf-lib and fontkit.

`tests/template.test.ts` validates the shipped `catalunya.json`, so a bad template
edit fails CI instead of reaching a printer.

**There is no automated PR reviewer any more** — Gemini Code Assist's consumer
version was sunset on 2026-07-17. The suite and CI are the only gate left, and a
suite catches regressions, not half-finished fixes: re-read the whole path before
calling something done.

## Deploy

Pushes to `main` deploy automatically via `.github/workflows/pages.yml`. GitHub
Pages must stay in **GitHub Actions** mode — in the older "deploy from branch"
mode it publishes the repo root, which serves the unbuilt `index.html` and breaks
the site.

`ci.yml` runs typecheck + tests + build on every PR, and `pages.yml` runs the same
gate before deploying, so a red suite cannot reach the live site.

## Search / sharing

`index.html` carries the description, canonical and Open Graph/Twitter tags;
`public/og-card.png` (1200×630) is the link preview.

- **`public/google1408f12f161d5c2a.html` is the Search Console ownership token —
  do not delete it.** Google re-checks it, and the property would silently
  unverify. It verifies the URL-prefix property
  `https://nuncaeslupus.github.io/farma-kit/`; the bare subdomain root 404s and
  belongs to no repo, so only this prefix is verifiable.
- **No `robots.txt` is possible.** It is only honoured at the origin root, which
  we do not own — one under `/farma-kit/` would be silently ignored. Absent
  already means allow-all.
- The **`<noscript>`** block is the only crawlable copy for crawlers that don't
  run JS. It must stay **outside** `<fk-root>`: Lit renders there in light DOM and
  does *not* clear pre-existing children, so the same markup inside would sit
  visible underneath the app.
- The sitemap is ceremonial (one URL) and its Search Console status has read
  "Couldn't fetch" while the page indexed fine anyway — don't chase it.

## Status

- The page is **indexed** by Google (verified 2026-07-17). It will not *rank* for
  competitive terms from a github.io path with no backlinks; a colegio linking to
  it would outweigh every tag here. Sharing the link is the realistic distribution
  channel.
- `catalunya.json` has been re-traced from the original artwork and printed onto a
  real sheet — alignment is good, with the 1.72 pt caveat above.
- Catalunya is still the only template. Every other col·legi is listed but not
  selectable.

## Next up

- **Share button** — the app now produces a proper preview card when shared, and
  sharing is how this actually reaches pharmacists. Use the Web Share API
  (`navigator.share`, which gives the native share sheet on mobile) with a
  copy-link fallback where it is unsupported. It belongs in `.page-foot`, next to
  *Contactar*.
- **GitHub link** — to this repo, same footer. There is none today.

Both are UI strings, so they need `ca`/`es` entries in `src/lib/i18n.ts` (the
key-parity test enforces both). Watch the trap that has bitten twice: an element
carrying `data-i18n` has its `textContent` overwritten by `applyLang` on every
language switch — anything dynamic inside it must be re-applied afterwards (see
`syncColegiLabel`).
