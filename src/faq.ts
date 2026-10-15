/**
 * Entry for the static FAQ pages (faq/, ca/faq/, eu/faq/, gl/faq/) — the
 * coupon-sheet tool's FAQ. Content is baked into each shell; the shared
 * chrome comes from lib/static-page.
 */
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/faq.css';
import { type Lang } from './lib/i18n';
import { langFromPath } from './lib/validation';
import { mountStaticPage, toolHref } from './lib/static-page';

const lang: Lang = langFromPath(location.pathname);
// Language links go to the sibling FAQ page (each language is its own shell).
const langHref = (l: string) => `${toolHref(l)}faq/`;

mountStaticPage({ lang, langHref, faqHref: langHref(lang), active: 'coupons' });
