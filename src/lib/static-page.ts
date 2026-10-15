/**
 * Shared bootstrap for the static, per-language pages (FAQ and the barcode
 * scanner section). Their content is baked into each HTML shell (crawlable);
 * this applies the saved theme, mounts the SAME header + footer the tool uses
 * into #faqTop / #faqBottom, translates the chrome labels and wires the
 * language segment and theme switch.
 */
import { render } from 'lit';
import { headerTemplate, footerTemplate } from '../components/chrome';
import { applyStoredTheme, toggleTheme } from './theme';
import { applyLang, type Lang, I18N } from './i18n';

const BASE = import.meta.env.BASE_URL;

/** Tool URL for a language: es → /farma-kit/, ca → /farma-kit/ca/, … */
export const toolHref = (l: Lang | string): string => (l === 'es' ? BASE : `${BASE}${l}/`);
/** Scanner-section index for a language. */
export const scannersHref = (l: Lang | string): string => `${toolHref(l)}lectores/`;

// Footer contact, standalone (the tool's Contact uses its form; here it's a
// plain mail). Email kept obfuscated like the app.
const EMAIL = atob('ZmFybWFraXRzdXBwb3J0QGdtYWlsLmNvbQ==');
const CONTACT: Record<Lang, { subject: string; body: string }> = {
  es: { subject: 'Contacto', body: 'Hola,\n\n' },
  ca: { subject: 'Contacte', body: 'Hola,\n\n' },
  eu: { subject: 'Kontaktua', body: 'Kaixo,\n\n' },
  gl: { subject: 'Contacto', body: 'Ola,\n\n' },
};

export function mountStaticPage(opts: {
  lang: Lang;
  langHref: (lang: string) => string;
  faqHref: string;
  active: 'coupons' | 'scanners';
}): void {
  const { lang } = opts;
  applyStoredTheme();

  let shareTimer: ReturnType<typeof setTimeout> | undefined;
  /** Flash the "link copied" toast (same feedback as the app's clipboard path). */
  const flashShare = (): void => {
    const toast = document.getElementById('shareToast');
    const status = document.getElementById('shareStatus');
    if (!toast) return;
    clearTimeout(shareTimer);
    const msg = I18N[lang].shareCopied as string;
    toast.textContent = msg;
    toast.classList.add('show');
    if (status) status.textContent = msg;
    shareTimer = setTimeout(() => {
      toast.classList.remove('show');
      if (status) status.textContent = '';
    }, 2000);
  };
  const onShare = (): void => {
    const data = { title: document.title, url: location.href };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
      return;
    }
    navigator.clipboard
      ?.writeText(location.href)
      .then(flashShare)
      .catch(() => {});
  };
  const onContact = (): void => {
    const { subject, body } = CONTACT[lang];
    const href = `mailto:${EMAIL}?subject=${encodeURIComponent(`[farma-kit] ${subject}`)}&body=${encodeURIComponent(body)}`;
    window.open(href, '_blank', 'noopener');
  };

  const top = document.getElementById('faqTop');
  const bottom = document.getElementById('faqBottom');
  // Absolute links (not ../) so they hold even without a trailing slash; these
  // pages never switch language in place, so there's no staleness to handle.
  const nav = { couponsHref: toolHref(lang), scannersHref: scannersHref(lang), active: opts.active };
  if (top) render(headerTemplate({ langHref: opts.langHref, homeHref: toolHref(lang), nav }), top);
  if (bottom) render(footerTemplate({ onShare, onContact, faqHref: opts.faqHref }), bottom);

  // Translate the chrome's data-i18n labels (+ any static data-i18n content),
  // keeping the page's own baked <title>.
  applyLang(document.body, lang, { title: false });

  document.querySelectorAll<HTMLAnchorElement>('.seg a').forEach((a) => {
    if (a.dataset.lang === lang) a.setAttribute('aria-current', 'page');
  });
  const themeBtn = document.getElementById('themeBtn');
  const syncTheme = () =>
    themeBtn?.setAttribute(
      'aria-checked',
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'true' : 'false',
    );
  syncTheme();
  themeBtn?.addEventListener('click', () => {
    toggleTheme();
    syncTheme();
  });
}
