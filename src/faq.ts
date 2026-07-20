/**
 * Entry for the static FAQ pages (faq/, ca/faq/, eu/faq/, gl/faq/). The FAQ
 * content is baked into each shell (crawlable, per-language); this loads the
 * shared styles, applies the saved theme, and mounts the SAME header + footer
 * the tool uses (from components/chrome) into the shell's #faqTop / #faqBottom
 * slots, so the top and bottom bars are identical to the tool. No app here.
 */
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/faq.css';
import { render } from 'lit';
import { headerTemplate, footerTemplate } from './components/chrome';
import { applyStoredTheme, toggleTheme } from './lib/theme';
import { applyLang, type Lang, I18N } from './lib/i18n';
import { langFromPath } from './lib/validation';

const BASE = import.meta.env.BASE_URL;
const lang: Lang = langFromPath(location.pathname);

applyStoredTheme();

// Language links go to the sibling FAQ page (a full navigation — each language
// is its own baked shell). es → /faq/, ca → /ca/faq/, …
const langHref = (l: string) => (l === 'es' ? `${BASE}faq/` : `${BASE}${l}/faq/`);

// Footer actions, standalone (the tool's Contact uses its form; here it's a
// plain mail). Email kept obfuscated like the app.
const EMAIL = atob('ZmFybWFraXRzdXBwb3J0QGdtYWlsLmNvbQ==');
const CONTACT: Record<Lang, { subject: string; body: string }> = {
  es: { subject: 'Contacto', body: 'Hola,\n\n' },
  ca: { subject: 'Contacte', body: 'Hola,\n\n' },
  eu: { subject: 'Kontaktua', body: 'Kaixo,\n\n' },
  gl: { subject: 'Contacto', body: 'Ola,\n\n' },
};

let shareTimer: ReturnType<typeof setTimeout> | undefined;
/** Flash the "link copied" toast (same feedback as the app's clipboard path). */
function flashShare(): void {
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
}
function onShare(): void {
  const data = { title: document.title, url: location.href };
  if (navigator.share) {
    navigator.share(data).catch(() => {});
    return;
  }
  navigator.clipboard
    ?.writeText(location.href)
    .then(flashShare)
    .catch(() => {});
}
function onContact(): void {
  const { subject, body } = CONTACT[lang];
  const href = `mailto:${EMAIL}?subject=${encodeURIComponent(`[farma-kit] ${subject}`)}&body=${encodeURIComponent(body)}`;
  window.open(href, '_blank', 'noopener');
}

const top = document.getElementById('faqTop');
const bottom = document.getElementById('faqBottom');
if (top) render(headerTemplate({ langHref }), top);
if (bottom) render(footerTemplate({ onShare, onContact, faqHref: langHref(lang) }), bottom);

// Translate the chrome's data-i18n labels + the static FAQ content to this URL's
// language (the shells are baked per language; this keeps everything in sync).
applyLang(document.body, lang);

// Mark the active language and theme state, and wire the theme toggle.
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
