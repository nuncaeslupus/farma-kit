import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { headerTemplate, footerTemplate } from '../components/chrome';
import { COLEGIOS } from '../lib/colegios';
import { I18N, applyLang, type Lang } from '../lib/i18n';
import { slug, type Template } from '../lib/template';
import { CP2PROV, titleCase, VAL, langFromPath, pageRangeExceeds } from '../lib/validation';
import { applyStoredTheme, toggleTheme } from '../lib/theme';
import { generatePdf } from '../lib/pdf/generate';

/* Base64 only to keep the address out of the bundle and the public repo as a
   plain string, where email harvesters regex for it. It is a speed bump against
   bulk scrapers, not a secret: anyone with DevTools reads it in seconds. */
const REQUEST_EMAIL = atob('ZmFybWFraXRzdXBwb3J0QGdtYWlsLmNvbQ==');

/* Language-independent tag on every subject this app generates. Mail that does
   not carry it was not sent from here — filter on it to forward the real
   requests on, and leave harvested spam behind. */
const MAIL_TAG = '[farma-kit]';
const RKEY = 'cupons_remember';
const COLEGI_KEY = 'cupons_colegi'; // remembered independently of Recorda'm
const PBKEY = 'cupons_privacybar_hidden';

/* Hand the mailto to the OS/webmail handler in a new tab: a same-tab mailto
   navigates this page away, and a webmail handler would leave the user's
   half-filled form behind. Cost: a browser with no handler may leave an empty
   tab open — accepted, losing the form is worse. */
function openMail(href: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Combobox filter only; the bug-prone form logic lives in ../lib/validation.
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Pharmacy-facing generator. The col·legi is chosen FIRST and gates everything
 * below (native `inert`): the whole flow — instructions, national code, which
 * fields exist and whether the stamp section applies — is driven by the chosen
 * colegio's template, so future colegios only need a template JSON, no code.
 */
@customElement('generator-app')
export class GeneratorApp extends LitElement {
  private uiLang: Lang = 'es';
  private indexOk = false;
  // Monotonic id per loadTemplate call. The selection-value check below can't tell
  // two in-flight fetches for the SAME colegio apart (slow failure + quick retry),
  // so each call also invalidates every earlier one.
  private tplFetchId = 0;
  private supported = new Set<string>();
  private templateMap: Record<string, string> = {}; // colegio slug → template file slug
  private tpl: Template | null = null; // template of the currently-chosen colegio
  private provManual = false;
  private activeIdx = -1;
  private monthNative?: boolean; // cached: does this browser implement type="month"?
  private pdfUrl: string | null = null; // last generated blob URL, revoked on the next run
  private cpCitiesP: Promise<Record<string, string[]>> | null = null; // memoized postal fetch
  private shareTimer?: ReturnType<typeof setTimeout>; // clears the "copied" flash on the share button
  private genOpener: HTMLElement | null = null; // focus to restore once the generation modal closes
  private warnOpener: HTMLElement | null = null; // focus to restore if the pre-generate warning is cancelled
  private q = (s: string) => this.querySelector(s) as HTMLElement;
  private i = (id: string) => this.querySelector('#' + id) as HTMLInputElement;

  protected createRenderRoot() {
    return this; // light DOM
  }

  async firstUpdated() {
    // The URL is the single source of truth for language: / is Spanish, /ca/,
    // /eu/ and /gl/ are the other locales (four crawlable shells, see index.html
    // and {ca,eu,gl}/index.html). There used to be a stored preference +
    // navigator.language detection here, but a stored non-default silently
    // overrode the root URL, so the crawlable link to the Spanish version
    // rendered another language anyway — a link that "did not work".
    this.uiLang = langFromPath(location.pathname);
    applyStoredTheme();
    // Apply the language BEFORE the awaited index fetch. The render() templates
    // default to Catalan text, so deferring this until after the network round-trip
    // flashed Catalan and then swapped to Spanish. document.body also reaches the
    // static about/FAQ in the HTML shell (outside fk-root), which carries data-i18n.
    applyLang(document.body, this.uiLang);
    this.setLangButtons();

    this.indexOk = await this.loadIndex();

    this.buildColegis();
    this.wireTheme();
    this.wireLang();
    this.wireSegell();
    this.wirePages();
    this.wireInputs();
    this.wireProvinceCity();
    this.wireValidation();
    this.wireWarn();
    this.wireRemember();
    this.defaultMonth();
    this.syncMonthHint();
    this.wireGenerate();
    // buildColegis() rendered the picker AFTER the early applyLang above, and its
    // "not available"/"request" labels carry Catalan defaults — translate the list
    // now (same as retryIndex does after a rebuild).
    applyLang(this.q('#colegiList'), this.uiLang);

    // restore remembered colegio (independent of Recorda'm), then the rest
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(COLEGI_KEY);
    } catch {
      /* ignore */
    }
    if (saved) await this.selectColegi(saved);
    this.restoreRemember();
  }

  /** Fetch the colegio→template index. Kept separate so a failed load can be retried
      from the picker instead of silently rendering every colegio as unsupported. */
  private async loadIndex(): Promise<boolean> {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}templates/index.json`);
      if (!res.ok) return false;
      this.templateMap = await res.json();
      Object.keys(this.templateMap).forEach((s) => this.supported.add(s));
      return true;
    } catch {
      return false;
    }
  }

  private isSupported(v: string) {
    return !!v && this.supported.has(slug(v));
  }

  // ---------- language / theme ----------
  private setLangButtons() {
    this.querySelectorAll<HTMLAnchorElement>('.seg a').forEach((a) => {
      // aria-current="page", not aria-pressed: these are links to the two
      // language URLs, and the active one IS the current page.
      if (a.dataset.lang === this.uiLang) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    this.querySelector('#themeBtn')?.setAttribute(
      'aria-checked',
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'true' : 'false',
    );
  }
  private wireLang() {
    // The switcher entries are real <a href> so crawlers can follow them and
    // they work without JS; this handler is progressive enhancement that swaps
    // the text in place instead, so a half-filled form survives the switch.
    this.querySelectorAll<HTMLAnchorElement>('.seg a').forEach((a) =>
      a.addEventListener('click', (e) => {
        // Modified clicks (new tab/window) keep native link behavior.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        const target = a.dataset.lang as Lang;
        if (target === this.uiLang) return;
        this.uiLang = target;
        // ca and es are distinct crawlable shells (/, /ca/). Swap text in place
        // for a seamless toggle, but pushState the URL to its sibling so it stays
        // shareable and honest — a hard refresh still serves the right shell, and
        // crawlers hit each URL directly regardless.
        history.pushState(null, '', a.href);
        applyLang(document.body, target); // body: also reaches the shell's static about/FAQ
        this.syncColegiLabel(); // applyLang just wiped the picked colegio back to the placeholder
        this.syncMonthHint(); // the month example is language-dependent
        this.setLangButtons();
        this.updatePages();
      }),
    );
    // Keep back/forward honest: the toggle uses pushState, so navigating history
    // must re-derive the language from the URL rather than leave stale UI.
    window.addEventListener('popstate', this.onPopLang);
  }
  private onPopLang = () => {
    const lang: Lang = langFromPath(location.pathname);
    if (lang === this.uiLang) return;
    this.uiLang = lang;
    applyLang(document.body, lang); // body: also reaches the shell's static about/FAQ
    this.syncColegiLabel();
    this.syncMonthHint();
    this.setLangButtons();
    this.updatePages();
  };
  private wireTheme() {
    this.q('#themeBtn').addEventListener('click', () => {
      toggleTheme();
      this.setLangButtons();
    });
  }

  // ---------- col·legi combobox ----------
  private renderColegiList() {
    let h = '';
    if (!this.indexOk) {
      h =
        `<div class="combo-err"><span data-i18n="loadErr">${I18N[this.uiLang].loadErr}</span>` +
        `<button type="button" class="combo-req combo-retry" data-i18n="retry">${I18N[this.uiLang].retry}</button></div>`;
    } else {
      for (const g of COLEGIOS) {
        h += `<div class="combo-group" role="presentation">${g.region}</div>`;
        for (const name of g.colegios) {
          const sup = this.supported.has(slug(name));
          h +=
            `<div class="combo-opt${sup ? '' : ' unsupported'}" role="option" id="copt-${slug(name)}" aria-selected="false" data-val="${name}">` +
            `<span class="combo-opt-name">${name}</span>` +
            (sup
              ? ''
              : `<span class="combo-req-status" data-i18n="reqStatus">Encara no disponible</span>` +
                // AT/keyboard users cannot reach this nested control (role=option
                // containing a button is invalid ARIA) — they go through
                // #colegiNoteReq instead once the unsupported colegio is selected.
                `<button type="button" class="combo-req" data-colegi="${name}" data-i18n="reqBtn" aria-hidden="true" tabindex="-1">Demanar</button>`) +
            `</div>`;
        }
      }
    }
    (this.q('#colegiList') as HTMLElement).innerHTML = h;
  }
  private buildColegis() {
    this.renderColegiList();

    const btn = this.q('#colegiBtn');
    const list = this.q('#colegiList');
    const search = this.i('colegiSearch');

    btn.addEventListener('click', () => this.openColegi(this.q('#colegiPanel').hidden));
    search.addEventListener('input', () => this.filterColegis(search.value));
    search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setActive(this.activeIdx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setActive(this.activeIdx - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // A highlighted option wins; otherwise, only when the user has typed a
        // query, Enter selects the top match (type-and-Enter). With an empty
        // search, Enter selects nothing — never auto-pick a random first colegio.
        const opts = this.visibleOpts();
        const query = this.i('colegiSearch').value.trim();
        (opts[this.activeIdx] ?? (query ? opts[0] : undefined))?.click();
      }
    });
    list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const retry = t.closest('.combo-retry') as HTMLElement | null;
      if (retry) {
        e.stopPropagation();
        void this.retryIndex();
        return;
      }
      const req = t.closest('.combo-req') as HTMLElement | null;
      if (req) {
        e.stopPropagation();
        this.demanar(req.dataset.colegi || '');
        return;
      }
      const opt = t.closest('.combo-opt') as HTMLElement | null;
      if (opt) void this.selectColegi(opt.dataset.val || '');
    });
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onDocKey);
  }
  /** Re-attempt a failed index load in place, from the retry row in the picker. */
  private async retryIndex() {
    this.indexOk = await this.loadIndex();
    this.renderColegiList();
    applyLang(this.q('#colegiList'), this.uiLang);
  }
  private onDocClick = (e: MouseEvent) => {
    if (this.isConnected && !this.q('#colegiCombo').contains(e.target as Node)) this.openColegi(false);
  };
  private onDocKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // A modal up front owns Escape — never fall through to the combobox behind it.
    // The pre-generate warning is a plain confirm, so Escape cancels it.
    const warn = this.q('#warnModal');
    if (!warn.hidden) {
      this.cancelWarn();
      return;
    }
    // Generation modal: close when idle, do nothing mid-generation.
    const modal = this.q('#genModal');
    if (!modal.hidden) {
      if (this.q('#genProgress').hidden) this.closeGenModal();
      return;
    }
    this.openColegi(false);
  };
  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onDocKey);
    window.removeEventListener('popstate', this.onPopLang);
    // Release the last PDF: generate() only revokes the previous one on the next
    // run, so an unmount in between would strand it. Reachable only in dev (the
    // #editor route; prod drops the editor and never leaves the generator), but it
    // belongs with the other teardown rather than as a special case.
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
    clearTimeout(this.shareTimer);
    this.barRO?.disconnect();
    super.disconnectedCallback();
  }

  private visibleOpts() {
    return Array.from(this.querySelectorAll<HTMLElement>('.combo-opt')).filter(
      (o) => o.style.display !== 'none',
    );
  }
  private setActive(i: number) {
    const opts = this.visibleOpts();
    const search = this.i('colegiSearch');
    if (!opts.length) {
      this.activeIdx = -1;
      search.removeAttribute('aria-activedescendant');
      return;
    }
    if (i < 0) i = opts.length - 1;
    if (i >= opts.length) i = 0;
    opts.forEach((o) => {
      o.classList.remove('active');
      o.setAttribute('aria-selected', 'false');
    });
    this.activeIdx = i;
    opts[i].classList.add('active');
    opts[i].setAttribute('aria-selected', 'true');
    opts[i].scrollIntoView({ block: 'nearest' });
    search.setAttribute('aria-activedescendant', opts[i].id);
  }
  private openColegi(o: boolean) {
    const panel = this.q('#colegiPanel');
    const hadFocus = !o && panel.contains(document.activeElement);
    panel.hidden = !o;
    const search = this.i('colegiSearch');
    this.q('#colegiBtn').setAttribute('aria-expanded', String(o));
    search.setAttribute('aria-expanded', String(o));
    if (o) {
      search.value = '';
      this.filterColegis('');
      this.activeIdx = -1;
      search.removeAttribute('aria-activedescendant');
      setTimeout(() => search.focus(), 0);
    } else if (hadFocus) {
      this.q('#colegiBtn').focus();
    }
  }
  private filterColegis(query: string) {
    const nq = norm(query);
    this.querySelectorAll<HTMLElement>('.combo-opt').forEach((o) => {
      o.classList.remove('active');
      o.style.display = norm(o.dataset.val || '').includes(nq) ? '' : 'none';
    });
    this.activeIdx = -1;
    this.i('colegiSearch').removeAttribute('aria-activedescendant');
    this.querySelectorAll<HTMLElement>('.combo-group').forEach((gr) => {
      let any = false;
      let n = gr.nextElementSibling as HTMLElement | null;
      while (n && !n.classList.contains('combo-group')) {
        if (n.classList.contains('combo-opt') && n.style.display !== 'none') any = true;
        n = n.nextElementSibling as HTMLElement | null;
      }
      gr.style.display = any ? '' : 'none';
    });
    // A query that matches nothing must say so — an empty panel reads as broken.
    // (Only when the list actually has options: the load-error state has none.)
    this.q('#colegiNoResults').hidden = !this.indexOk || this.visibleOpts().length > 0;
  }
  /**
   * Render the combo label from the current value: the chosen colegio (a proper
   * noun, same in both languages) or the placeholder in the active language.
   * Must re-run after applyLang(), which resets #colegiVal to the placeholder
   * because the span carries data-i18n="colegiPh".
   */
  private syncColegiLabel() {
    const val = this.i('colegi').value;
    const valEl = this.q('#colegiVal');
    valEl.textContent = val || (I18N[this.uiLang].colegiPh as string);
    valEl.classList.toggle('placeholder', !val);
  }
  private async selectColegi(val: string) {
    this.i('colegi').value = val;
    this.syncColegiLabel();
    this.openColegi(false);
    this.q('#tplLoadErr').hidden = true;
    try {
      if (val) localStorage.setItem(COLEGI_KEY, val);
    } catch {
      /* ignore */
    }

    const supported = this.isSupported(val);
    // unsupported / cleared → lock the form, offer to request the template
    this.q('#colegiNote').hidden = supported || !val;
    (this.q('#colegiNoteReq') as HTMLElement).dataset.colegi = val;
    if (supported) {
      this.q('#err-colegi').style.display = 'none';
      this.q('#colegiBtn').removeAttribute('aria-invalid');
      this.q('#colegiBtn').removeAttribute('aria-describedby');
      await this.loadTemplate(val);
    } else {
      this.tpl = null;
      this.setGate(false);
    }
    this.resolveProvincia();
    this.saveRemember();
  }
  private demanar(name: string) {
    if (!name) return;
    // Basque parenthesizes the place ("... Elkargoa (Barcelona)") to sidestep the
    // genitive suffix a "de [name]" calque would need; es/ca/gl read naturally.
    const col: string = {
      es: `Colegio de Farmacéuticos de ${name}`,
      ca: `Col·legi de Farmacèutics de ${name}`,
      eu: `Farmazialarien Elkargoa (${name})`,
      gl: `Colexio de Farmacéuticos de ${name}`,
    }[this.uiLang];
    const subjectText: string = {
      es: `Pedir plantilla para el ${col}`,
      ca: `Demanar plantilla per al ${col}`,
      eu: `Txantiloi-eskaera: ${col}`,
      gl: `Pedir modelo para o ${col}`,
    }[this.uiLang];
    const subject = `${MAIL_TAG} ${subjectText}`;
    const body: string = {
      es:
        `Hola,\n\nNecesito la plantilla para el ${col}. Adjunto la máxima información posible sobre el modelo de hoja:\n\n` +
        `· CN de las hojas (para pedirlas al mayorista): [...]\n` +
        `· Campos a rellenar y sus formatos (o ejemplos): [...]\n\n\n` +
        `· Me consta que esta hoja es válida para los colegios de: ${name}, [Añadir todos los conocidos]\n\n` +
        `Adjunto el PDF de la hoja oficial proporcionada por el ${col}.\n\nGracias.`,
      ca:
        `Hola,\n\nNecessito la plantilla per al ${col}. Adjunto la màxima informació possible sobre el model de full:\n\n` +
        `· CN dels fulls (per demanar-los al majorista): [...]\n` +
        `· Camps a emplenar i els seus formats (o exemples): [...]\n\n\n` +
        `· Em consta que aquest full és vàlid per als col·legis de: ${name}, [Afegir tots els coneguts]\n\n` +
        `Adjunto el PDF del full oficial proporcionat pel ${col}.\n\nGràcies.`,
      eu:
        `Kaixo,\n\nTxantiloia behar dut elkargo honetarako: ${col}. Orri-ereduari buruzko ahalik eta informazio gehien eransten dut:\n\n` +
        `· Orrien CN (handizkariari eskatzeko): [...]\n` +
        `· Bete beharreko eremuak eta haien formatuak (edo adibideak): [...]\n\n\n` +
        `· Badakit orri hau elkargo hauetarako balio duela: ${name}, [Gehitu ezagutzen dituzun guztiak]\n\n` +
        `Elkargoak emandako orri ofizialaren PDFa eransten dut.\n\nEskerrik asko.`,
      gl:
        `Ola,\n\nNecesito o modelo para o ${col}. Achego a máxima información posible sobre o modelo de folla:\n\n` +
        `· CN das follas (para pedilas ao distribuidor): [...]\n` +
        `· Campos a encher e os seus formatos (ou exemplos): [...]\n\n\n` +
        `· Sei que esta folla é válida para os colexios de: ${name}, [Engadir todos os coñecidos]\n\n` +
        `Achego o PDF da folla oficial proporcionada polo ${col}.\n\nGrazas.`,
    }[this.uiLang];
    openMail(
      `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  }

  /** General feedback ("this template doesn't fit", etc.) — same inbox as Demanar. */
  private contactar() {
    const colegio = this.i('colegi').value;
    const subjectText = { es: 'Contacto', ca: 'Contacte', eu: 'Kontaktua', gl: 'Contacto' }[
      this.uiLang
    ];
    const subject = `${MAIL_TAG} ${subjectText}`;
    const intro: string = {
      es: 'Hola,\n\n(Escribe aquí tu consulta, problema o sugerencia. Por ejemplo: "uso esta plantilla pero no encaja bien".)\n',
      ca: 'Hola,\n\n(Escriu aquí la teva consulta, problema o suggeriment. Per exemple: "faig servir aquesta plantilla però no encaixa bé".)\n',
      eu: 'Kaixo,\n\n(Idatzi hemen zure kontsulta, arazoa edo iradokizuna. Adibidez: "txantiloi hau erabiltzen dut, baina ez da ondo egokitzen".)\n',
      gl: 'Ola,\n\n(Escribe aquí a túa consulta, problema ou suxestión. Por exemplo: "uso este modelo pero non encaixa ben".)\n',
    }[this.uiLang];
    const colLabel = { es: 'Colegio', ca: 'Col·legi', eu: 'Elkargoa', gl: 'Colexio' }[this.uiLang];
    const body = intro + (colegio ? `\n${colLabel}: ${colegio}\n` : '');
    openMail(
      `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  }

  /**
   * Web Share API on mobile (native share sheet); copy-to-clipboard where it's
   * unsupported (desktop browsers). `navigator.share` rejects on user cancel —
   * that is not a failure, so it is swallowed rather than surfaced as one.
   */
  private async share() {
    const data = { title: document.title, url: location.href };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* cancelled, or the OS refused it — nothing to recover from */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(location.href);
      this.flashShareFeedback();
    } catch {
      /* no share sheet, no clipboard access — nothing more this button can do */
    }
  }
  /**
   * Confirm the copy with a small overlay toast above the button, so the button
   * label stays put — relabelling it changed its width and shifted the whole
   * centered footer line. The toast carries no data-i18n, so applyLang() leaves
   * it alone; its text is set here in the current language on each flash.
   */
  private flashShareFeedback() {
    const toast = this.q('#shareToast');
    clearTimeout(this.shareTimer);
    toast.textContent = I18N[this.uiLang].shareCopied as string;
    toast.classList.add('show');
    this.q('#shareStatus').textContent = I18N[this.uiLang].shareCopied as string;
    this.shareTimer = setTimeout(() => {
      toast.classList.remove('show');
      this.q('#shareStatus').textContent = '';
    }, 2000);
  }

  // ---------- template-driven gate ----------
  private async loadTemplate(colegio: string) {
    const fetchId = ++this.tplFetchId;
    const file = this.templateMap[slug(colegio)];
    this.q('#tplLoadErr').hidden = true;
    let tpl: Template;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}templates/${file}.json`);
      if (!res.ok) throw new Error(String(res.status));
      tpl = (await res.json()) as Template;
    } catch {
      // A superseded call must not report; a same-colegio retry may have succeeded.
      if (this.tplFetchId !== fetchId) return;
      // A stale failure must not clobber a newer selection's template.
      if (this.i('colegi').value !== colegio) return;
      this.tpl = null;
      this.setGate(false);
      // Failing to load is not "unsupported": swap the misleading gate hint for
      // an error note with a retry, or the app blames the colegio for a network blip.
      this.q('#gateHint').hidden = true;
      this.q('#tplLoadErr').hidden = false;
      return;
    }
    // Rapid switching can resolve fetches out of order; only the newest call for
    // the still-current selection may install its template, CN line and segell
    // gate. (The value check still matters on its own: selecting an unsupported
    // colegio never calls loadTemplate, so it bumps no id.)
    if (this.tplFetchId !== fetchId) return;
    if (this.i('colegi').value !== colegio) return;
    this.tpl = tpl;
    // National code (varies per colegio)
    const cnLine = this.q('#cnLine');
    if (this.tpl.cn) {
      cnLine.hidden = false;
      (this.q('#cnCode') as HTMLElement).textContent = this.tpl.cn;
    } else {
      cnLine.hidden = true;
    }
    // Stamp section only if the template offers it (segell !== false)
    const segellOn = this.tpl.segell !== false;
    this.q('#segellSection').hidden = !segellOn;
    if (!segellOn) {
      this.i('segell').checked = false;
      this.i('segell').dispatchEvent(new Event('change'));
    }
    this.setGate(true);
  }
  /** Enable/disable everything below the colegio picker (native `inert`). */
  private setGate(open: boolean) {
    const gated = this.q('#gated');
    // The form just became fillable, so the CP field is a few seconds away:
    // warm the postal data now instead of on the 5th digit, where the user
    // waits on it.
    if (open) void this.loadCpCities();
    gated.inert = !open;
    gated.toggleAttribute('data-locked', !open);
    this.q('#gateHint').hidden = open;
    // collapse the instructions: they belong to a colegio, and leaving them open
    // would keep showing the previous colegio's steps and National Code.
    if (!open) {
      const instr = this.querySelector<HTMLDetailsElement>('details.instr');
      if (instr) instr.open = false;
    }
  }

  // ---------- segell + pages ----------
  private wireSegell() {
    const segell = this.i('segell');
    const opt = this.q('#optFields');
    const sync = () => {
      opt.dataset.off = String(!segell.checked);
      opt
        .querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')
        .forEach((el) => (el.disabled = !segell.checked));
    };
    segell.addEventListener('change', () => {
      sync();
      Object.values(VAL).forEach((r) => {
        if (!r.segell) return;
        this.q('#err-' + r.id).style.display = 'none';
        this.i(r.id).removeAttribute('aria-invalid');
      });
    });
    sync();
  }
  private wirePages() {
    this.i('full').addEventListener('input', () => this.updatePages());
    this.i('num').addEventListener('input', () => this.updatePages());
  }
  private updatePages() {
    const full = parseInt(this.i('full').value, 10);
    const num = parseInt(this.i('num').value, 10);
    const out = this.q('#pagesOut');
    const pageField = this.tpl?.fields.find((f) => f.key === 'page');
    if (full >= 1 && num >= 1) {
      // Don't preview a range the page comb can't hold: submit refuses it, so the
      // live line must warn here too rather than show an impossible "…a la 10048".
      if (pageField && pageRangeExceeds(full, num, pageField.cells)) {
        const max = String(10 ** pageField.cells - 1);
        out.textContent = (I18N[this.uiLang].errRange as (m: string) => string)(max);
        out.classList.remove('empty');
        out.classList.add('over');
        return;
      }
      out.innerHTML = (I18N[this.uiLang].pages_fmt as (a: string, b: string, n: string) => string)(
        String(full),
        String(full + num - 1),
        String(num),
      );
      out.classList.remove('empty', 'over');
    } else {
      out.textContent = '—';
      out.classList.add('empty');
      out.classList.remove('over');
    }
  }
  /**
   * Chrome renders type="month" as a localized picker ("julio de 2026"), where a
   * raw-format hint would be plain wrong. Firefox/Safari don't implement it at all:
   * the field degrades to a text box showing "2026-07" with no clue about the
   * format — which matters, because month and year are sliced out of that value by
   * position. So hint only where the fallback is actually in play, with a live
   * example ("p. ej. 2026-07") rather than an abstract mask.
   * Re-run after applyLang(): the example is language-dependent.
   */
  private syncMonthHint() {
    if (this.monthNative === undefined) {
      const probe = document.createElement('input');
      probe.setAttribute('type', 'month');
      this.monthNative = probe.type === 'month';
    }
    const fmt = this.q('#mesFmt');
    if (this.monthNative) {
      fmt.hidden = true; // native picker — a format hint would mislead
      return;
    }
    const now = new Date();
    const eg = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    fmt.hidden = false;
    fmt.textContent = (I18N[this.uiLang].mesEg as (ym: string) => string)(eg);
    this.i('mes').placeholder = eg; // greyed example once the field is cleared
  }
  private defaultMonth() {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    if (now.getDate() === lastDay && now.getHours() >= 12) {
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    this.i('mes').value = `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  // ---------- input filtering ----------
  private wireInputs() {
    const digits = (id: string, max: number) => {
      const el = this.i(id);
      el.addEventListener('input', () => {
        const v = el.value.replace(/[^\d]/g, '').slice(0, max);
        if (v !== el.value) el.value = v;
      });
    };
    digits('up', 5);
    digits('full', 4);
    digits('num', 4);
    digits('cp', 5);
    const nif = this.i('nif');
    nif.addEventListener('input', () => {
      const v = nif.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 9);
      if (v !== nif.value) nif.value = v;
    });
  }

  // ---------- province + city autofill ----------
  private wireProvinceCity() {
    this.i('provincia').addEventListener('change', () => (this.provManual = true));
    this.i('cp').addEventListener('input', () => {
      this.resolveProvincia();
      void this.lookupCity();
    });
  }
  private setProvincia(name: string) {
    const sel = this.i('provincia') as unknown as HTMLSelectElement;
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text === name) {
        sel.selectedIndex = i;
        return true;
      }
    }
    return false;
  }
  private resolveProvincia() {
    if (this.provManual) return;
    const d = (this.i('cp').value || '').replace(/\D/g, '').slice(0, 2);
    if (d.length === 2 && CP2PROV[d]) {
      this.setProvincia(CP2PROV[d]);
      return;
    }
    const c = this.i('colegi').value;
    if (this.isSupported(c)) this.setProvincia(c);
    else (this.i('provincia') as unknown as HTMLSelectElement).value = '';
  }
  /* Fetch the CP→cities map once. Memoizing the *promise* rather than the result
     dedupes callers that race while it is in flight, and clearing it on failure
     lets the next keystroke retry — caching {} left autofill dead for the whole
     session after one blip. Prefetched from setGate(), so it is normally warm
     long before the user reaches the CP field. */
  private loadCpCities(): Promise<Record<string, string[]>> {
    this.cpCitiesP ??= fetch(`${import.meta.env.BASE_URL}postal/cp-cities.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .catch(() => {
        this.cpCitiesP = null;
        return {};
      });
    return this.cpCitiesP;
  }

  // fillField=false only refreshes the <datalist> suggestions and never touches the
  // población value — used when restoring, where the saved city is trusted (it may
  // be a hand-typed one this CP's list doesn't contain, which we must not wipe).
  private async lookupCity(fillField = true) {
    const cp = (this.i('cp').value || '').replace(/\D/g, '');
    if (cp.length !== 5) return;
    const cities = (await this.loadCpCities())[cp];
    // Rewrite unconditionally: an unknown CP must clear the previous CP's
    // suggestions, not leave them on offer.
    this.q('#pobles').innerHTML = (cities ?? []).map((c) => `<option value="${c}"></option>`).join('');
    if (!fillField) return;
    if (!cities || !cities.length) return; // unknown CP: we know nothing, leave the field alone
    const pob = this.i('poblacio');
    // A city left over from a previous CP is stale: it would print a wrong
    // address, and because <datalist> filters its options by the field's text,
    // it also hides every suggestion for the new CP. Only drop it when this CP
    // is known and cannot have it.
    if (pob.value && !cities.includes(pob.value)) pob.value = '';
    if (!pob.value && cities.length === 1) pob.value = cities[0];
  }

  // ---------- validation ----------
  private wireValidation() {
    Object.keys(VAL).forEach((key) => {
      const el = this.i(key);
      el.addEventListener('blur', () => {
        el.dataset.touched = '1';
        this.validateField(key, true);
      });
      el.addEventListener('input', () => {
        if (el.dataset.touched) this.validateField(key, false);
      });
    });
  }
  private validateField(key: string, forceShow: boolean): boolean {
    const vd = VAL[key];
    const el = this.i(key);
    const v = el.value.trim();
    const errEl = this.q('#err-' + key);
    if (vd.segell && !this.i('segell').checked) {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
      errEl.style.display = 'none';
      return true;
    }
    let ok: boolean;
    let msg: string | undefined;
    if (v === '') {
      if (vd.segell) {
        ok = false;
        msg = 'errRequired';
      } else {
        ok = vd.test ? vd.test(v) : true;
        msg = vd.msg;
      }
    } else {
      ok = vd.test ? vd.test(v) : true;
      msg = vd.msg;
    }
    if (!ok && (forceShow || el.dataset.touched)) {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', 'err-' + key);
      errEl.textContent = I18N[this.uiLang][msg!] as string;
      errEl.style.display = 'block';
      return false;
    }
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    errEl.style.display = 'none';
    return ok;
  }
  private validateColegi(forceShow: boolean): boolean {
    const ok = this.isSupported(this.i('colegi').value);
    if (!ok && forceShow) {
      const btn = this.q('#colegiBtn');
      btn.setAttribute('aria-invalid', 'true');
      btn.setAttribute('aria-describedby', 'err-colegi');
      const err = this.q('#err-colegi');
      err.textContent = I18N[this.uiLang].errColegi as string;
      err.style.display = 'block';
    }
    return ok;
  }

  // ---------- bottom bar (privacy + pre-generate warning) ----------
  private wireWarn() {
    this.q('#warnOk').addEventListener('click', () => {
      this.showWarn(false);
      this.warnOpener = null; // generate() opens (and restores focus for) its own modal
      void this.generate();
    });
    this.q('#warnCancel').addEventListener('click', () => this.cancelWarn());
    this.q('#barX').addEventListener('click', () => {
      this.q('#privacyBar').hidden = true;
      try {
        localStorage.setItem(PBKEY, '1');
      } catch {
        /* ignore */
      }
    });
    try {
      if (localStorage.getItem(PBKEY) === '1') {
        this.q('#privacyBar').hidden = true;
      }
    } catch {
      /* ignore */
    }
    this.wirePrivacyBarSpacing();
  }
  /**
   * A fixed-position bar doesn't push layout — it just paints over whatever
   * sits underneath it — so something in the normal flow has to reserve its
   * height, or a tall bar (a wrapped 3-clause privacy message on a narrow
   * phone, or a long warning) covers this footer's Share / Contactar / GitHub
   * links. That can't be `body`'s own padding: `html, body { min-height: 100% }`
   * pins body's box to exactly the viewport, so once content overflows past
   * it — the normal case once the form is tall enough to scroll — body's own
   * padding-bottom stops affecting layout at all (confirmed: setting it to
   * 500px changed nothing). #barSpacer is a plain block inside .wrap instead,
   * so its height genuinely extends the scrollable document. Track the bar's
   * real height rather than guessing at one, so it stays right across screen
   * width, language, and the privacy-message/warning swap in showWarn().
   */
  private barRO?: ResizeObserver;
  private wirePrivacyBarSpacing() {
    const bar = this.q('#privacyBar');
    const spacer = this.q('#barSpacer');
    const sync = () => {
      const h = bar.hidden ? 0 : bar.getBoundingClientRect().height;
      spacer.style.height = `${h}px`;
      // The shell's static about/FAQ section renders after fk-root, so IT is
      // the last thing in flow now — publish the bar's height as a CSS var so
      // .about's padding-bottom can reserve the same clearance (see app.css).
      document.documentElement.style.setProperty('--privacy-bar-h', `${h}px`);
    };
    this.barRO = new ResizeObserver(sync);
    this.barRO.observe(bar);
    sync();
  }
  /** Show/hide the pre-generate warning as a modal confirm (see #warnModal). */
  private showWarn(on: boolean) {
    if (on) this.warnOpener = document.activeElement as HTMLElement | null;
    this.q('#warnModal').hidden = !on;
  }
  /** Dismiss the warning without generating, returning focus to what opened it. */
  private cancelWarn() {
    this.showWarn(false);
    (this.warnOpener ?? this.querySelector<HTMLElement>('button[type="submit"]'))?.focus();
    this.warnOpener = null;
  }
  private mesPhrase(y: number, m: number) {
    const locale = { es: 'es-ES', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES' }[this.uiLang];
    const name = new Date(y, m, 1).toLocaleDateString(locale, { month: 'long' });
    // Basque takes no Romance preposition: "[year]ko [month]" (e.g. "2026ko uztaila").
    if (this.uiLang === 'eu') return `${y}ko ${name}`;
    // Catalan elides the preposition before a vowel/h ("d'abril" vs "de març");
    // es and gl never elide. All three then close with " de [year]".
    const prep = this.uiLang === 'ca' && /^[aeiouàèéíòóúh]/i.test(name) ? "d'" : 'de ';
    return prep + name + ' de ' + y;
  }
  private computeWarning(): string | null {
    const mv = this.i('mes').value;
    if (!mv) return null;
    const [sy, smRaw] = mv.split('-').map(Number);
    const sm = smRaw - 1;
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth();
    const sel = sy * 12 + sm;
    const cur = cy * 12 + cm;
    const full = parseInt(this.i('full').value, 10) || 0;
    const lastDay = new Date(cy, cm + 1, 0).getDate();
    const nearEnd = now.getDate() >= lastDay - 2;
    const t = I18N[this.uiLang];
    if (sel > cur) return (t.warnAhead as (m: string) => string)(this.mesPhrase(sy, sm));
    if (sel === cur && full === 1 && nearEnd)
      return (t.warnCurrent as (m: string) => string)(this.mesPhrase(cy, cm));
    return null;
  }

  // ---------- Recorda'm ----------
  private wireRemember() {
    const rem = this.i('remember');
    rem.addEventListener('change', () => {
      if (rem.checked) this.saveRemember();
      else
        try {
          localStorage.removeItem(RKEY);
        } catch {
          /* ignore */
        }
    });
    const form = this.q('#form');
    form.addEventListener('input', () => this.saveRemember());
    form.addEventListener('change', () => this.saveRemember());
  }
  private saveRemember() {
    if (!this.i('remember').checked) return;
    const data = {
      colegi: this.i('colegi').value,
      up: this.i('up').value,
      segell: this.i('segell').checked,
      cognoms: this.i('cognoms').value,
      nom: this.i('nom').value,
      nif: this.i('nif').value,
      cp: this.i('cp').value,
      adreca: this.i('adreca').value,
      poblacio: this.i('poblacio').value,
      provincia: (this.i('provincia') as unknown as HTMLSelectElement).value,
    };
    try {
      localStorage.setItem(RKEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }
  private restoreRemember() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(RKEY);
    } catch {
      /* ignore */
    }
    if (!raw) return;
    let d: Record<string, string | boolean>;
    try {
      d = JSON.parse(raw);
    } catch {
      return;
    }
    this.i('remember').checked = true;
    this.i('up').value = String(d.up || '');
    // Never re-check segell for a template that hides the section: loadTemplate
    // just unchecked it, and a hidden checked box turns every hidden stamp field
    // into a silently-failing required one on submit.
    this.i('segell').checked = !!d.segell && this.tpl?.segell !== false;
    this.i('segell').dispatchEvent(new Event('change'));
    this.i('cognoms').value = String(d.cognoms || '');
    this.i('nom').value = String(d.nom || '');
    this.i('nif').value = String(d.nif || '');
    this.i('cp').value = String(d.cp || '');
    this.i('adreca').value = String(d.adreca || '');
    this.i('poblacio').value = String(d.poblacio || '');
    // Populate the city suggestions for the restored CP (datalist only — never
    // overwrite the saved población, which may not be in this CP's list).
    void this.lookupCity(false);
    // Restore the saved província, but DON'T mark it manual: a restored value is
    // not a fresh override, so correcting the CP afterwards should still re-sync
    // the province (a real manual change sets provManual via its change listener).
    if (d.provincia) {
      (this.i('provincia') as unknown as HTMLSelectElement).value = String(d.provincia);
    }
  }

  // ---------- generate ----------
  private wireGenerate() {
    (this.q('#form') as HTMLFormElement).addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad: HTMLElement | null = null;
      if (!this.validateColegi(true)) firstBad = this.q('#colegiBtn');
      Object.keys(VAL).forEach((key) => {
        if (!this.validateField(key, true) && !firstBad) firstBad = this.i(key);
      });
      // The page comb has a fixed cell count; a run past its capacity would print
      // silently truncated (duplicated) sheet numbers — refuse it here.
      const pageField = this.tpl?.fields.find((f) => f.key === 'page');
      if (!firstBad && pageField) {
        const start = parseInt(this.i('full').value, 10) || 1;
        const count = Math.max(1, parseInt(this.i('num').value, 10) || 1);
        if (pageRangeExceeds(start, count, pageField.cells)) {
          const max = String(10 ** pageField.cells - 1);
          const err = this.q('#err-num');
          err.textContent = (I18N[this.uiLang].errRange as (max: string) => string)(max);
          err.style.display = 'block';
          const num = this.i('num');
          num.dataset.touched = '1';
          num.setAttribute('aria-invalid', 'true');
          firstBad = num;
        }
      }
      if (firstBad) {
        firstBad.focus();
        return;
      }
      const w = this.computeWarning();
      if (w) {
        this.q('#warnMsg').innerHTML = w;
        this.showWarn(true);
        this.q('#warnOk').focus();
        return;
      }
      void this.generate();
    });
  }
  private async generate() {
    if (!this.tpl) return;
    const tpl = this.tpl;
    const modal = this.q('#genModal');
    const bar = this.q('#genBar');
    const result = this.q('#genResult');
    const error = this.q('#genError');
    result.hidden = true;
    error.hidden = true;
    this.q('#genProgress').hidden = false;
    this.genOpener = document.activeElement as HTMLElement | null;
    modal.hidden = false;
    (modal.querySelector('.modal') as HTMLElement).focus();
    this.setGenTitle('genTitle');
    bar.style.width = '30%';

    try {
      // .trim() like every other field below: validateField trims before testing,
      // so " 2026-07 " passes validation — but month/year are sliced out of this
      // by position, and the untrimmed value would print month "-0", year "02".
      const mes = this.i('mes').value.trim();
      const segell = this.i('segell').checked;
      const v = (id: string) => this.i(id).value.trim();

      const base: Record<string, string> = {};
      for (const f of tpl.fields) {
        switch (f.key) {
          case 'page':
            break;
          case 'up':
            base.up = v('up');
            break;
          case 'month':
            base.month = mes.slice(5, 7);
            break;
          case 'year':
            base.year = mes.slice(2, 4);
            break;
          case 'titular':
            if (segell) base.titular = `${v('cognoms').toUpperCase()}, ${v('nom').toUpperCase()}`;
            break;
          case 'nif':
            if (segell) base.nif = v('nif').toUpperCase();
            break;
          case 'address':
            if (segell) base.address = titleCase(v('adreca'));
            break;
          case 'cpCity':
            if (segell) base.cpCity = `${v('cp')}  ${titleCase(v('poblacio'))}`;
            break;
          case 'province':
            if (segell) base.province = v('provincia').toUpperCase();
            break;
          default: {
            // The template model is open (custom keys), but this form only has the
            // preset inputs — querySelector must not throw on a digit-leading key
            // nor .value on a null. An unknown field prints blank, not a crash.
            const el = this.querySelector<HTMLInputElement>('#' + CSS.escape(f.key));
            base[f.key] = el ? el.value.trim() : '';
          }
        }
      }

      const count = Math.max(1, parseInt(v('num'), 10) || 1);
      const start = parseInt(v('full'), 10) || 1;
      const pageField = tpl.fields.find((f) => f.key === 'page');
      const pages: Record<string, string>[] = [];
      for (let i = 0; i < count; i++) {
        const p = { ...base };
        if (pageField) p.page = String(start + i).padStart(pageField.cells, '0');
        pages.push(p);
      }

      bar.style.width = '70%';
      const bytes = await generatePdf(tpl, pages, null);
      // Release the previous document's blob: each run allocates a new one and the
      // browser holds it until revoked. Safe by now — an earlier tab has long since
      // loaded its copy, and revoking only invalidates the URL, not a loaded doc.
      if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const url = this.pdfUrl;
      bar.style.width = '100%';
      (this.q('#genDownload') as HTMLAnchorElement).href = url;

      // Success: hand the PDF straight to a new tab and get out of the way — one
      // click, not two. Generation is async but keeps the click's transient
      // activation, so the tab is allowed; a slow run (many pages) can outlive
      // that window and get refused, and open() returns null then — fall back to
      // the modal's link rather than leave the user with nothing.
      // NB: no 'noopener' feature — it makes open() return null even on success,
      // which would break that check. Sever the opener on the handle instead.
      // open() can also *throw* (sandboxed iframe, some WebViews) — that must not
      // reach the outer catch and cry "could not generate" over a PDF that is
      // sitting right there. Treat it like a refusal and fall back.
      // Severing the opener can throw too (restricted contexts), and a PDF that
      // opened fine must not be reported as a failure over it — so it shares the
      // try. `tab` stays set, so a throw here still counts as opened.
      let tab: Window | null = null;
      try {
        tab = window.open(url, '_blank');
        if (tab) tab.opener = null;
      } catch {
        /* refused — fall through to the modal link */
      }
      if (tab) {
        this.closeGenModal();
        this.q('#genProgress').hidden = true;
        this.setGenTitle('genTitle'); // reset for the next run
        return;
      }
      this.q('#genProgress').hidden = true;
      this.setGenTitle('genDone');
      result.hidden = false;
      (this.q('#genDownload') as HTMLElement).focus();
    } catch {
      this.q('#genProgress').hidden = true;
      this.setGenTitle('genErrTitle');
      this.q('#genErrMsg').textContent = I18N[this.uiLang].genErrGeneric as string;
      error.hidden = false;
      (this.q('#genErrClose') as HTMLElement).focus();
    }
  }

  /** Retarget the modal title's i18n key so it also survives a language switch. */
  private setGenTitle(key: 'genTitle' | 'genDone' | 'genErrTitle') {
    const t = this.q('.modal-title.gen');
    t.dataset.i18n = key;
    t.textContent = I18N[this.uiLang][key] as string;
  }

  /** Close the modal and give focus back to where generation started. */
  private closeGenModal() {
    this.q('#genModal').hidden = true;
    this.genOpener?.focus();
    this.genOpener = null;
  }

  /** Minimal Tab trap: the page behind the overlay is visually covered but still
      in the tab order (light DOM), so wrap focus at the dialog's edges. Bound to
      each `.modal`, so `currentTarget` is the dialog — shared by both overlays. */
  private onModalKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const dialog = e.currentTarget as HTMLElement;
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    ).filter((el) => el.offsetParent !== null);
    if (!focusables.length) {
      // Mid-generation the dialog has no interactive content at all — swallow
      // Tab entirely or focus escapes to the covered page behind the overlay.
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  render() {
    const provinces = COLEGIOS.flatMap((g) => g.colegios).sort((a, b) => a.localeCompare(b));
    return html`
      <main class="wrap">
        ${headerTemplate({
          langHref: (l) => (l === 'es' ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}${l}/`),
        })}
        <header>
          <div class="brand">
            <img class="logo" src="${import.meta.env.BASE_URL}brand/rellenador.svg" alt="" width="54" height="54" />
            <h1 data-i18n="appTitle">Emplenador de <span class="lo">fulls de cupons precinte</span></h1>
          </div>
        </header>

        <p class="lead" data-i18n="intro">Aquesta utilitat et permetrà omplir la capçalera dels fulls de cupons precinte.</p>

        <!-- col·legi first: it gates everything below -->
        <section class="colegi-pick">
          <label id="colegiLbl" for="colegiBtn" class="pick-label" data-i18n="chooseFirst">Tria el teu Col·legi de Farmacèutics</label>
          <div class="combo" id="colegiCombo">
            <button type="button" class="combo-btn" id="colegiBtn" aria-haspopup="listbox" aria-expanded="false">
              <span class="combo-val placeholder" id="colegiVal" data-i18n="colegiPh">Selecciona el teu col·legi…</span>
              <svg class="combo-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
            </button>
            <div class="combo-panel" id="colegiPanel" hidden>
              <input type="text" class="combo-search" id="colegiSearch" role="combobox" aria-expanded="false" aria-controls="colegiList" aria-autocomplete="list" aria-label="Cerca…" data-i18n-ph="searchPh" placeholder="Cerca…" autocomplete="off" />
              <div class="combo-list" id="colegiList" role="listbox" aria-labelledby="colegiLbl"></div>
              <div class="combo-empty" id="colegiNoResults" data-i18n="noResults" hidden>Sense resultats</div>
            </div>
            <input type="hidden" id="colegi" name="colegi" value="" form="form" />
          </div>
          <span class="field-err" id="err-colegi" role="alert"></span>
          <div class="field-note colegi-note" id="colegiNote" hidden>
            <span id="colegiNoteText" data-i18n="noTemplate">Encara no tenim la plantilla d'aquest col·legi. Demana-la i l'afegirem perquè la puguis fer servir.</span>
            <button type="button" class="combo-req" id="colegiNoteReq" data-i18n="reqBtn" @click=${() => this.demanar(this.i('colegi').value)}>Demanar</button>
          </div>
          <div class="field-note colegi-note" id="tplLoadErr" hidden>
            <span data-i18n="tplErr">No s'ha pogut carregar la plantilla. Comprova la connexió i torna-ho a provar.</span>
            <button type="button" class="combo-req" data-i18n="retry" @click=${() => {
              const c = this.i('colegi').value;
              if (c) void this.loadTemplate(c);
            }}>Torna-ho a provar</button>
          </div>
          <p class="gate-hint" id="gateHint" data-i18n="gateHint">Selecciona un col·legi amb plantilla disponible per continuar.</p>
        </section>

        <div id="gated" class="gated" data-locked inert>
          <details class="instr">
            <summary>
              <span data-i18n="instr">Instruccions</span>
              <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>
            </summary>
            <ol>
              <li data-i18n="step1">Posa a la impressora els fulls que necessitis.</li>
              <li data-i18n="step2" data-i18n-html>Omple el formulari.</li>
              <li data-i18n="step3" data-i18n-html>Genera i imprimeix sobre els fulls.</li>
            </ol>
            <p class="cn-line" id="cnLine" hidden><span data-i18n="cnLabel">Codi Nacional dels fulls</span>: <b id="cnCode"></b></p>
          </details>

          <form class="card" id="form" autocomplete="off" novalidate>
            <section class="col">
              <div class="group-head"><h2 data-i18n="oblig">Informació general</h2></div>
              <p class="group-sub" data-i18n="obligSub">Per omplir la capçalera dels fulls.</p>

              <div class="field">
                <label for="up" data-i18n="up">UP de la farmàcia</label>
                <input id="up" name="up" type="text" inputmode="numeric" maxlength="5" class="numr" placeholder="10000" />
                <span class="field-err" id="err-up" role="alert"></span>
              </div>
              <div class="field">
                <!-- data-i18n sits on the inner span, not the label: applyLang
                     replaces textContent, which would eat the format hint. -->
                <label for="mes"
                  ><span data-i18n="mes">Mes i any</span
                  ><span class="mes-fmt" id="mesFmt" hidden></span></label
                >
                <input id="mes" name="mes" type="month" />
                <span class="field-err" id="err-mes" role="alert"></span>
              </div>
              <div class="two-up">
                <div class="field"><label for="full" data-i18n="full">Full inicial</label><input id="full" name="full" type="text" inputmode="numeric" maxlength="4" class="numr" placeholder="1" /><span class="field-err" id="err-full" role="alert"></span></div>
                <div class="field"><label for="num" data-i18n="num">Quantitat de fulls</label><input id="num" name="num" type="text" inputmode="numeric" maxlength="4" class="numr" placeholder="50" /><span class="field-err" id="err-num" role="alert"></span></div>
              </div>

              <div class="pages-line" aria-live="polite">
                <div class="lab"><span data-i18n="pages">Pàgines a imprimir</span></div>
                <div class="pages empty" id="pagesOut">—</div>
              </div>
            </section>

            <div class="divider" aria-hidden="true"></div>

            <section class="col" id="segellSection">
              <label class="check segell-toggle"><input type="checkbox" id="segell" /><span data-i18n="segell">Generar també les dades del segell</span></label>
              <div class="opt-fields" id="optFields" data-off="true">
                <div class="field"><label for="cognoms" data-i18n="cognoms">Cognoms del titular</label><input id="cognoms" name="cognoms" type="text" disabled /><span class="field-err" id="err-cognoms" role="alert"></span></div>
                <div class="field"><label for="nom" data-i18n="nom">Nom del titular</label><input id="nom" name="nom" type="text" disabled /><span class="field-err" id="err-nom" role="alert"></span></div>
                <div class="two-up">
                  <div class="field"><label for="nif" data-i18n="nif">NIF</label><input id="nif" name="nif" type="text" maxlength="9" disabled /><span class="field-err" id="err-nif" role="alert"></span></div>
                  <div class="field"><label for="cp" data-i18n="cp">Codi postal</label><input id="cp" name="cp" type="text" inputmode="numeric" maxlength="5" class="numr" disabled /><span class="field-err" id="err-cp" role="alert"></span></div>
                </div>
                <div class="field"><label for="adreca" data-i18n="adreca">Adreça</label><input id="adreca" name="adreca" type="text" disabled /><span class="field-err" id="err-adreca" role="alert"></span></div>
                <div class="two-up">
                  <div class="field"><label for="poblacio" data-i18n="poblacio">Població</label><input id="poblacio" name="poblacio" type="text" list="pobles" disabled /><datalist id="pobles"></datalist><span class="field-err" id="err-poblacio" role="alert"></span></div>
                  <div class="field"><label for="provincia" data-i18n="provincia">Província</label>
                    <select id="provincia" name="provincia" disabled>
                      <option value="" data-i18n="provinciaPh" selected>—</option>
                      ${provinces.map((p) => html`<option>${p}</option>`)}
                    </select>
                    <span class="field-err" id="err-provincia" role="alert"></span>
                  </div>
                </div>
              </div>
            </section>
          </form>

          <div class="actions">
            <label class="check"><input type="checkbox" id="remember" /><span data-i18n="remember">Recorda'm</span></label>
            <button type="submit" form="form" class="btn" data-i18n="generar">Generar Document</button>
          </div>
        </div>

        ${footerTemplate({
          onShare: () => this.share(),
          onContact: () => this.contactar(),
          // Relative to the current tool URL (which always has a trailing slash:
          // /farma-kit/, /farma-kit/eu/, …), so it points to the current
          // language's FAQ even after an in-place language switch — the template
          // isn't re-rendered on switch, so an absolute uiLang-based href goes
          // stale (e.g. Euskera tool → Spanish FAQ).
          faqHref: 'faq/',
        })}
        <div class="bar-spacer" id="barSpacer" aria-hidden="true"></div>

        <div class="modal-overlay" id="genModal" hidden>
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="genTitle" tabindex="-1" @keydown=${this.onModalKey}>
            <div class="modal-title gen" id="genTitle" role="status" data-i18n="genTitle">Generant el document…</div>
            <div class="gen-progress" id="genProgress" aria-busy="true"><div class="progress-track"><div class="progress-fill" id="genBar"></div></div></div>
            <div class="gen-result" id="genResult" hidden>
              <div class="modal-actions">
                <a class="btn" id="genDownload" href="#" target="_blank" rel="noopener" data-i18n="genDownload">Obrir / Descarregar PDF</a>
                <button type="button" class="btn-ghost" data-i18n="genClose" @click=${() => this.closeGenModal()}>Tancar</button>
              </div>
            </div>
            <div class="gen-error" id="genError" hidden>
              <p class="modal-msg" id="genErrMsg"></p>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" id="genErrClose" data-i18n="genClose" @click=${() => this.closeGenModal()}>Tancar</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="warnModal" hidden>
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="warnTitle" aria-describedby="warnMsg" tabindex="-1" @keydown=${this.onModalKey}>
            <h2 class="modal-title" id="warnTitle" data-i18n="alertLabel">Alerta!</h2>
            <p class="modal-msg" id="warnMsg"></p>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" id="warnCancel" data-i18n="cancel">Cancel·lar</button>
              <button type="button" class="btn" id="warnOk" data-i18n="continuar">Continuar</button>
            </div>
          </div>
        </div>
      </main>

      <div class="privacy-bar" id="privacyBar">
        <div class="privacy-msg" id="privacyMsg">
          <span data-i18n="alertText">Aquesta pàgina no pertany a cap Col·legi de Farmacèutics</span>
          <span class="dot" aria-hidden="true">·</span>
          <span data-i18n="privacy">Les dades es processen al teu navegador i no s'envien enlloc</span>
          <span class="dot" aria-hidden="true">·</span>
          <span data-i18n="noCookies">El lloc no fa servir cookies</span>
        </div>
        <button type="button" class="bar-x" id="barX" aria-label="Tancar / Cerrar">×</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'generator-app': GeneratorApp;
  }
}
