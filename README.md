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
2. Load a scan of the sheet, place the fields, export the JSON to `public/templates/<slug>.json`.
3. Point the colegio at it in `public/templates/index.json`.
4. **Verify against a printed sheet before shipping** — print onto a real coupon sheet and check the alignment. Geometry that looks right on screen can still be off on paper.

`src/lib/colegios.ts` holds the canonical list of colegios, grouped by autonomous community.

## Development

```bash
npm install
npm run dev        # dev server → localhost:5173/farma-kit/
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run typecheck
```

Vite + Lit + TypeScript, no test framework. `base` is `/farma-kit/` (see `vite.config.ts`) so the GitHub Pages project-site URL resolves even without a trailing slash.

Pushes to `main` deploy automatically via `.github/workflows/pages.yml`. GitHub Pages must stay in **GitHub Actions** mode — in the older "deploy from branch" mode it publishes the repo root, which serves the unbuilt `index.html` and breaks the site.

## Status

`catalunya.json` (CN 140663) has not yet been checked against a physically printed sheet.
