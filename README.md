# Farma-Kit

Fills in the header of Spanish pharmacy **coupon sheets** (*fulls de cupons precinte* / *hojas de cupones precinto*) for the electronic prescription system.

**→ [nuncaeslupus.github.io/farma-kit](https://nuncaeslupus.github.io/farma-kit/)**

You print the output *on top of* the official coupon sheets supplied by the wholesaler — the app prints only the pharmacy's data, never the sheet itself.

## Privacy

Everything runs in your browser. The pharmacy data you type is never uploaded: the PDF is generated locally with [pdf-lib](https://pdf-lib.js.org/). There is no backend, no analytics, and no cookies.

## How it works

You pick your *col·legi de farmacèutics* first, and that choice drives the rest of the form. Each col·legi maps to a template JSON describing its sheet geometry — where each field sits, in points, on the page:

```
public/templates/index.json      colegio slug → template slug
public/templates/<slug>.json     the sheet geometry itself
```

The Catalan colegios (Barcelona, Girona, Lleida, Tarragona) all map to a single `catalunya.json`, because one physical sheet covers all four. The template also carries the National Code printed on the sheet (`cn`) and whether the stamp section (`segell`) applies, so those follow the col·legi automatically.

Fields are **open by design**: each one carries its own `key` and `label` rather than coming from a fixed list, since colegios we haven't seen yet may need fields we can't foresee. See `src/lib/template.ts`.

A col·legi with no template yet is shown but not selectable — the app offers to request it instead.

## Adding a col·legi

Templates are traced from a physically printed sheet, so this needs a real sheet in hand:

1. `npm run dev`, then open [localhost:5173/farma-kit/#editor](http://localhost:5173/farma-kit/#editor) — the visual template editor. It is **dev-only**: `import.meta.env.DEV` is statically false in a production build, so the bundler drops the editor and the deployed site has no `#editor` route.
2. Upload a scan of the sheet and place the fields over it. In the **Template** panel set the **Template name** — that is the template *id*, not a colegio: it becomes `templates/<slug>.json`, and one template can serve several colegios (as `catalunya.json` serves four). Set the **National Code** if the sheet carries one.
3. **Generate test PDF** to check the result. Untick **Include official sheet** to see the data-only overlay — that is what actually prints onto the paper; with it ticked you are checking alignment against the scan.
4. **Export JSON** → `public/templates/<slug>.json`. Export is **blocked** if the template is invalid (malformed CN, blank or duplicate field key, box off the sheet, zero sizes) and tells you why — an exported file drives real printing, so a bad one is worse than no file.
5. Point the colegio at it in `public/templates/index.json`.
6. **Verify against a printed sheet before shipping** — print onto a real coupon sheet and check the alignment. Geometry that looks right on screen can still be off on paper.

`src/lib/colegios.ts` holds the canonical list of colegios, grouped by autonomous community.

The editor round-trips `cn` and `segell` even though only `cn` has a control: importing a hand-written template and re-exporting it returns byte-identical JSON. It did not always — an early re-export silently dropped `cn`, which hides the national-code line in the app entirely.

### Long values

Text is wrapped to the field's box width and, if the wrapped block is still taller than the box, the font shrinks (down to 4 pt) rather than spilling into the field below. The titular breaks at its comma — surnames above, name below — and never splits the name itself. So when designing a template, give a field the box you want and the `valign` that matches its safe growth direction: `top` grows downward, `bottom` pins the last line to the box's bottom edge and grows *upward* (what `cpCity`/`province` use, so a long city cannot spill below the printed box).

## Development

```bash
npm install
npm run dev        # dev server → localhost:5173/farma-kit/
npm test           # Vitest, once
npm run test:watch
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run typecheck
```

Vite + Lit + TypeScript. `base` is `/farma-kit/` (see `vite.config.ts`) so the GitHub Pages project-site URL resolves even without a trailing slash.

Pushes to `main` deploy automatically via `.github/workflows/pages.yml`. GitHub Pages must stay in **GitHub Actions** mode — in the older "deploy from branch" mode it publishes the repo root, which serves the unbuilt `index.html` and breaks the site.

`ci.yml` runs typecheck + tests + build on every PR, and `pages.yml` runs the same gate before deploying, so a red suite cannot reach the live site.

## Tests

Vitest + jsdom, ~110 tests in `tests/`.

One rule matters: **tests import the real source, never a copy of it.** The predecessor repo's suite mirrored the functions under test into the test file — it stayed green while the shipped code broke, and even tested a `validators` object that existed nowhere in `src/`. So anything worth testing has to be importable without side effects, which is why:

- the bug-prone form logic (`isNif`, `CP2PROV`, `titleCase`, the field rules, the ca/es language default) lives in `src/lib/validation.ts`, not inside `generator-app.ts` — a Lit element that registers a custom element and touches the DOM on import;
- the PDF line-breaking lives in `src/lib/pdf/wrap.ts`, apart from `generate.ts`, which pulls in pdf-lib and fontkit.

`tests/template.test.ts` validates the shipped `catalunya.json`, so a bad template edit fails CI instead of reaching a printer.

**There is no automated PR reviewer any more** — Gemini Code Assist's consumer version was sunset on 2026-07-17. The suite and CI are the only gate left, and a suite catches regressions, not half-finished fixes: re-read the whole path before calling something done.

## Search / sharing

`index.html` carries the description, canonical and Open Graph/Twitter tags; `public/og-card.png` (1200×630) is the link preview.

- **`public/google1408f12f161d5c2a.html` is the Search Console ownership token — do not delete it.** Google re-checks it, and the property would silently unverify. It verifies the URL-prefix property `https://nuncaeslupus.github.io/farma-kit/`; the bare subdomain root 404s and belongs to no repo, so only this prefix is verifiable.
- **No `robots.txt` is possible.** It is only honoured at the origin root, which we do not own — one under `/farma-kit/` would be silently ignored. Absent already means allow-all.
- The **`<noscript>`** block is the only crawlable copy for crawlers that don't run JS. It must stay **outside** `<fk-root>`: Lit renders there in light DOM and does *not* clear pre-existing children, so the same markup inside would sit visible underneath the app.
- The sitemap is ceremonial (one URL) and its Search Console status has read "Couldn't fetch" while the page indexed fine anyway — don't chase it.

## Status

- The page is **indexed** by Google (verified 2026-07-17). It will not *rank* for competitive terms from a github.io path with no backlinks; a colegio linking to it would outweigh every tag here. Sharing the link is the realistic distribution channel.
- `catalunya.json` (CN 140663) has not yet been checked against a physically printed sheet.

## Next up

- **Share button** — the app now produces a proper preview card when shared, and sharing is how this actually reaches pharmacists. Use the Web Share API (`navigator.share`, which gives the native share sheet on mobile) with a copy-link fallback where it is unsupported. It belongs in `.page-foot`, next to *Contactar*.
- **GitHub link** — to this repo, same footer. There is none today.

Both are UI strings, so they need `ca`/`es` entries in `src/lib/i18n.ts` (the key-parity test enforces both). Watch the trap that has bitten twice: an element carrying `data-i18n` has its `textContent` overwritten by `applyLang` on every language switch — anything dynamic inside it must be re-applied afterwards (see `syncColegiLabel`).
