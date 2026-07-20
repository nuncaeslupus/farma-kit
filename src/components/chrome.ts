/** Shared site chrome — the top utility bar (brand + language switch + theme)
 * and the bottom footer (Share · Contact · GitHub). Used by the generator app
 * AND the static FAQ pages so both have an identical top and bottom bar. The
 * markup uses the global classes in app.css; language/theme wiring is done by
 * the caller (it queries `.seg a` / `#themeBtn` in the DOM), and the footer's
 * actions are passed in so each page supplies its own. */
import { html, type TemplateResult } from 'lit';

const BASE = import.meta.env.BASE_URL;

/** Top utility bar. `langHref(lang)` gives the URL each language link points to
 * (the tool passes the tool URLs, the FAQ pages pass the FAQ URLs). */
export function headerTemplate(opts: { langHref: (lang: string) => string }): TemplateResult {
  return html`
    <div class="util-bar">
      <div class="app-brand">
        <span
          class="app-badge"
          aria-hidden="true"
          style="--svg-snake:url('${BASE}brand/farmakit-snake.svg');--svg-bowl:url('${BASE}brand/farmakit-bowl.svg')"
        ></span>
        <div class="app-id">
          <span class="app-name">Farma<span class="kit">Kit</span></span>
          <span class="app-tag" data-i18n="tagline">Eines per a la farmàcia</span>
        </div>
      </div>
      <div class="util-controls">
        <div class="seg" role="group" aria-label="Idioma">
          <a href="${opts.langHref('es')}" data-lang="es">Español</a>
          <a href="${opts.langHref('ca')}" data-lang="ca">Català</a>
          <a href="${opts.langHref('eu')}" data-lang="eu">Euskara</a>
          <a href="${opts.langHref('gl')}" data-lang="gl">Galego</a>
        </div>
        <button
          type="button"
          class="theme-switch"
          id="themeBtn"
          role="switch"
          aria-checked="false"
          aria-label="Tema clar / fosc"
        >
          <span class="ts-knob">
            <svg class="glyph glyph-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
            <svg class="glyph glyph-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>
          </span>
        </button>
      </div>
    </div>
  `;
}

/** Bottom footer. `onShare`/`onContact` are supplied by the caller so the tool
 * and the FAQ pages can each wire their own (the tool's Contact uses its form;
 * the FAQ pages pass a standalone mailto). */
export function footerTemplate(opts: {
  onShare: () => void;
  onContact: () => void;
  /** URL of the FAQ page for the current language (tool → its FAQ; FAQ → self). */
  faqHref: string;
}): TemplateResult {
  return html`
    <div class="page-foot">
      <a class="linklike" href="${opts.faqHref}">
        <svg class="foot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span data-i18n="seoTitle">Preguntas frecuentes</span>
      </a>
      <span class="foot-dot" aria-hidden="true">·</span>
      <button type="button" class="linklike" id="shareBtn" @click=${opts.onShare}>
        <svg class="foot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span data-i18n="share">Compartir</span>
        <span class="share-toast" id="shareToast" aria-hidden="true"></span>
      </button>
      <span class="visually-hidden" role="status" id="shareStatus"></span>
      <span class="foot-dot" aria-hidden="true">·</span>
      <button type="button" class="linklike" id="contactBtn" @click=${opts.onContact}>
        <svg class="foot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
        </svg>
        <span data-i18n="contact">Contactar</span>
      </button>
      <span class="foot-dot" aria-hidden="true">·</span>
      <a class="linklike" href="https://github.com/nuncaeslupus/farma-kit" target="_blank" rel="noopener">
        <svg class="foot-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.807 1.305 3.492.997.107-.775.42-1.305.763-1.605-2.665-.3-5.466-1.335-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.047.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
        </svg>
        <span data-i18n="githubLink">Codi a GitHub</span>
      </a>
    </div>
  `;
}
