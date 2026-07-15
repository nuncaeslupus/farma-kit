import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { COLEGIOS } from '../lib/colegios';
import { I18N, applyLang, type Lang } from '../lib/i18n';
import { slug, type Template } from '../lib/template';
import { generatePdf } from '../lib/pdf/generate';

/* Base64 only to keep the address out of the bundle and the public repo as a
   plain string, where email harvesters regex for it. It is a speed bump against
   bulk scrapers, not a secret: anyone with DevTools reads it in seconds. */
const REQUEST_EMAIL = atob('ZmFybWFraXRzdXBwb3J0QGdtYWlsLmNvbQ==');

/* Language-independent tag on every subject this app generates. Mail that does
   not carry it was not sent from here — filter on it to forward the real
   requests on, and leave harvested spam behind. */
const MAIL_TAG = '[farma-kit]';
const LANG_KEY = 'cupons_lang';
const THEME_KEY = 'cupons_theme';
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

// CP first-two-digits → province. Instant client-side province autofill.
const CP2PROV: Record<string, string> = {
  '01': 'Araba / Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería',
  '05': 'Ávila', '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona',
  '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón',
  '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca',
  '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia',
  '35': 'Las Palmas', '36': 'Pontevedra', '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
  '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel',
  '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia',
  '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function isNif(v: string): boolean {
  v = (v || '').toUpperCase();
  const L = 'TRWAGMYFPDXBNJZSQVHLCKE';
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{8})([A-Z])$/))) return L[+m[1] % 23] === m[2];
  if ((m = v.match(/^([XYZ])(\d{7})([A-Z])$/)))
    return L[+(({ X: '0', Y: '1', Z: '2' } as Record<string, string>)[m[1]] + m[2]) % 23] === m[3];
  return false;
}

type ValRule = { id: string; segell?: boolean; msg?: string; test?: (v: string) => boolean };
const VAL: Record<string, ValRule> = {
  up: { id: 'up', msg: 'errUp', test: (v) => /^\d{5}$/.test(v) },
  full: { id: 'full', msg: 'errNat', test: (v) => /^\d+$/.test(v) && +v >= 1 },
  num: { id: 'num', msg: 'errNat', test: (v) => /^\d+$/.test(v) && +v >= 1 },
  cognoms: { id: 'cognoms', segell: true },
  nom: { id: 'nom', segell: true },
  nif: { id: 'nif', segell: true, msg: 'errNif', test: isNif },
  cp: { id: 'cp', segell: true, msg: 'errCp', test: (v) => /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(v) },
  adreca: { id: 'adreca', segell: true },
  poblacio: { id: 'poblacio', segell: true },
  provincia: { id: 'provincia', segell: true },
};

/**
 * Pharmacy-facing generator. The col·legi is chosen FIRST and gates everything
 * below (native `inert`): the whole flow — instructions, national code, which
 * fields exist and whether the stamp section applies — is driven by the chosen
 * colegio's template, so future colegios only need a template JSON, no code.
 */
@customElement('generator-app')
export class GeneratorApp extends LitElement {
  private uiLang: Lang = 'es';
  private supported = new Set<string>();
  private templateMap: Record<string, string> = {}; // colegio slug → template file slug
  private tpl: Template | null = null; // template of the currently-chosen colegio
  private provManual = false;
  private barDismissed = false;
  private activeIdx = -1;
  private cpCitiesP: Promise<Record<string, string[]>> | null = null; // memoized postal fetch
  private q = (s: string) => this.querySelector(s) as HTMLElement;
  private i = (id: string) => this.querySelector('#' + id) as HTMLInputElement;

  protected createRenderRoot() {
    return this; // light DOM
  }

  async firstUpdated() {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === 'ca' || stored === 'es') this.uiLang = stored;
      else if (/^ca\b/i.test(navigator.language)) this.uiLang = 'ca';
    } catch {
      /* ignore */
    }
    try {
      if (localStorage.getItem(THEME_KEY) === 'dark')
        document.documentElement.setAttribute('data-theme', 'dark');
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}templates/index.json`);
      if (res.ok) {
        this.templateMap = await res.json();
        Object.keys(this.templateMap).forEach((s) => this.supported.add(s));
      }
    } catch {
      /* none supported */
    }

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
    this.wireGenerate();
    applyLang(this, this.uiLang);
    this.setLangButtons();

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

  private isSupported(v: string) {
    return !!v && this.supported.has(slug(v));
  }

  // ---------- language / theme ----------
  private setLangButtons() {
    this.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.lang === this.uiLang ? 'true' : 'false'),
    );
    this.querySelector('#themeBtn')?.setAttribute(
      'aria-checked',
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'true' : 'false',
    );
  }
  private wireLang() {
    this.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) =>
      b.addEventListener('click', () => {
        this.uiLang = b.dataset.lang as Lang;
        try {
          localStorage.setItem(LANG_KEY, this.uiLang);
        } catch {
          /* ignore */
        }
        applyLang(this, this.uiLang);
        this.setLangButtons();
        this.updatePages();
      }),
    );
  }
  private wireTheme() {
    this.q('#themeBtn').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      this.setLangButtons();
    });
  }

  // ---------- col·legi combobox ----------
  private buildColegis() {
    let h = '';
    for (const g of COLEGIOS) {
      h += `<div class="combo-group">${g.region}</div>`;
      for (const name of g.colegios) {
        const sup = this.supported.has(slug(name));
        h +=
          `<div class="combo-opt${sup ? '' : ' unsupported'}" role="option" data-val="${name}">` +
          `<span class="combo-opt-name">${name}</span>` +
          (sup
            ? ''
            : `<span class="combo-req-status" data-i18n="reqStatus">Encara no disponible</span>` +
              `<button type="button" class="combo-req" data-colegi="${name}" data-i18n="reqBtn">Demanar</button>`) +
          `</div>`;
      }
    }
    (this.q('#colegiList') as HTMLElement).innerHTML = h;

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
        this.visibleOpts()[this.activeIdx]?.click();
      }
    });
    list.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
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
  private onDocClick = (e: MouseEvent) => {
    if (this.isConnected && !this.q('#colegiCombo').contains(e.target as Node)) this.openColegi(false);
  };
  private onDocKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.openColegi(false);
  };
  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onDocKey);
    super.disconnectedCallback();
  }

  private visibleOpts() {
    return Array.from(this.querySelectorAll<HTMLElement>('.combo-opt')).filter(
      (o) => o.style.display !== 'none',
    );
  }
  private setActive(i: number) {
    const opts = this.visibleOpts();
    if (!opts.length) {
      this.activeIdx = -1;
      return;
    }
    if (i < 0) i = opts.length - 1;
    if (i >= opts.length) i = 0;
    opts.forEach((o) => o.classList.remove('active'));
    this.activeIdx = i;
    opts[i].classList.add('active');
    opts[i].scrollIntoView({ block: 'nearest' });
  }
  private openColegi(o: boolean) {
    const panel = this.q('#colegiPanel');
    panel.hidden = !o;
    this.q('#colegiBtn').setAttribute('aria-expanded', String(o));
    if (o) {
      const search = this.i('colegiSearch');
      search.value = '';
      this.filterColegis('');
      this.activeIdx = -1;
      setTimeout(() => search.focus(), 0);
    }
  }
  private filterColegis(query: string) {
    const nq = norm(query);
    this.querySelectorAll<HTMLElement>('.combo-opt').forEach((o) => {
      o.classList.remove('active');
      o.style.display = norm(o.dataset.val || '').includes(nq) ? '' : 'none';
    });
    this.activeIdx = -1;
    this.querySelectorAll<HTMLElement>('.combo-group').forEach((gr) => {
      let any = false;
      let n = gr.nextElementSibling as HTMLElement | null;
      while (n && !n.classList.contains('combo-group')) {
        if (n.classList.contains('combo-opt') && n.style.display !== 'none') any = true;
        n = n.nextElementSibling as HTMLElement | null;
      }
      gr.style.display = any ? '' : 'none';
    });
  }
  private async selectColegi(val: string) {
    this.i('colegi').value = val;
    const valEl = this.q('#colegiVal');
    valEl.textContent = val || (I18N[this.uiLang].colegiPh as string);
    valEl.classList.toggle('placeholder', !val);
    this.openColegi(false);
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
    const es = this.uiLang === 'es';
    const col = (es ? 'Colegio de Farmacéuticos de ' : 'Col·legi de Farmacèutics de ') + name;
    const subject = `${MAIL_TAG} ` + (es ? 'Pedir plantilla para el ' : 'Demanar plantilla per al ') + col;
    const body = es
      ? `Hola,\n\nNecesito la plantilla para el ${col}. Adjunto la máxima información posible sobre el modelo de hoja:\n\n` +
        `· CN de las hojas (para pedirlas al mayorista): \n` +
        `· Campos a rellenar y sus formatos (o ejemplos): \n\n\n` +
        `· Me consta que esta hoja es válida para los colegios de: ${name}, \n\n` +
        `Adjunto el PDF de la hoja oficial proporcionada por el ${col}.\n\nGracias.`
      : `Hola,\n\nNecessito la plantilla per al ${col}. Adjunto la màxima informació possible sobre el model de full:\n\n` +
        `· CN dels fulls (per demanar-los al majorista): \n` +
        `· Camps a emplenar i els seus formats (o exemples): \n\n\n` +
        `· Em consta que aquest full és vàlid per als col·legis de: ${name}, \n\n` +
        `Adjunto el PDF del full oficial proporcionat pel ${col}.\n\nGràcies.`;
    openMail(
      `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  }

  /** General feedback ("this template doesn't fit", etc.) — same inbox as Demanar. */
  private contactar() {
    const es = this.uiLang === 'es';
    const colegio = this.i('colegi').value;
    const subject = `${MAIL_TAG} ` + (es ? 'Contacto — Farma-Kit' : 'Contacte — Farma-Kit');
    const body =
      (es
        ? 'Hola,\n\n(Escribe aquí tu consulta, problema o sugerencia. Por ejemplo: "uso esta plantilla pero no encaja bien".)\n'
        : 'Hola,\n\n(Escriu aquí la teva consulta, problema o suggeriment. Per exemple: "faig servir aquesta plantilla però no encaixa bé".)\n') +
      (colegio ? `\n${es ? 'Colegio' : 'Col·legi'}: ${colegio}\n` : '');
    openMail(
      `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  }

  // ---------- template-driven gate ----------
  private async loadTemplate(colegio: string) {
    const file = this.templateMap[slug(colegio)];
    try {
      this.tpl = (await (
        await fetch(`${import.meta.env.BASE_URL}templates/${file}.json`)
      ).json()) as Template;
    } catch {
      this.tpl = null;
      this.setGate(false);
      return;
    }
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
    if (full >= 1 && num >= 1) {
      out.innerHTML = (I18N[this.uiLang].pages_fmt as (a: string, b: string, n: string) => string)(
        String(full),
        String(full + num - 1),
        String(num),
      );
      out.classList.remove('empty');
    } else {
      out.textContent = '—';
      out.classList.add('empty');
    }
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

  private async lookupCity() {
    const cp = (this.i('cp').value || '').replace(/\D/g, '');
    if (cp.length !== 5) return;
    const cities = (await this.loadCpCities())[cp];
    // Rewrite unconditionally: an unknown CP must clear the previous CP's
    // suggestions, not leave them on offer.
    this.q('#pobles').innerHTML = (cities ?? []).map((c) => `<option value="${c}"></option>`).join('');
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
      errEl.textContent = I18N[this.uiLang][msg!] as string;
      errEl.style.display = 'block';
      return false;
    }
    el.removeAttribute('aria-invalid');
    errEl.style.display = 'none';
    return ok;
  }
  private validateColegi(forceShow: boolean): boolean {
    const ok = this.isSupported(this.i('colegi').value);
    if (!ok && forceShow) {
      this.q('#colegiBtn').setAttribute('aria-invalid', 'true');
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
      void this.generate();
    });
    this.q('#warnCancel').addEventListener('click', () => this.showWarn(false));
    this.q('#barX').addEventListener('click', () => {
      this.barDismissed = true;
      this.q('#privacyBar').hidden = true;
      try {
        localStorage.setItem(PBKEY, '1');
      } catch {
        /* ignore */
      }
    });
    try {
      if (localStorage.getItem(PBKEY) === '1') {
        this.barDismissed = true;
        this.q('#privacyBar').hidden = true;
      }
    } catch {
      /* ignore */
    }
  }
  private showWarn(on: boolean) {
    this.q('#warnConfirm').hidden = !on;
    this.q('#privacyMsg').hidden = on; // bar shows either privacy OR the warning
    // the warning must appear even if the bar was dismissed; on cancel/ok,
    // return the bar to its dismissed state.
    this.q('#privacyBar').hidden = on ? false : this.barDismissed;
  }
  private mesPhrase(y: number, m: number) {
    const name = new Date(y, m, 1).toLocaleDateString(this.uiLang === 'es' ? 'es-ES' : 'ca-ES', {
      month: 'long',
    });
    if (this.uiLang === 'es') return 'de ' + name + ' de ' + y;
    const prep = /^[aeiouàèéíòóúh]/i.test(name) ? "d'" : 'de ';
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
    this.i('segell').checked = !!d.segell;
    this.i('segell').dispatchEvent(new Event('change'));
    this.i('cognoms').value = String(d.cognoms || '');
    this.i('nom').value = String(d.nom || '');
    this.i('nif').value = String(d.nif || '');
    this.i('cp').value = String(d.cp || '');
    this.i('adreca').value = String(d.adreca || '');
    this.i('poblacio').value = String(d.poblacio || '');
    if (d.provincia) {
      (this.i('provincia') as unknown as HTMLSelectElement).value = String(d.provincia);
      this.provManual = true;
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
      if (firstBad) {
        firstBad.focus();
        return;
      }
      const w = this.computeWarning();
      if (w) {
        this.q('#warnMsg').innerHTML = w;
        this.showWarn(true);
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
    modal.hidden = false;
    bar.style.width = '30%';

    try {
      const mes = this.i('mes').value;
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
          default:
            base[f.key] = v(f.key);
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
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      bar.style.width = '100%';
      (this.q('#genDownload') as HTMLAnchorElement).href = url;
      this.q('#genProgress').hidden = true;
      result.hidden = false;
    } catch {
      this.q('#genProgress').hidden = true;
      this.q('#genErrMsg').textContent = I18N[this.uiLang].genErrGeneric as string;
      error.hidden = false;
    }
  }

  render() {
    const provinces = COLEGIOS.flatMap((g) => g.colegios).sort((a, b) => a.localeCompare(b));
    return html`
      <main class="wrap">
        <header>
          <div class="brand">
            <svg class="logo" viewBox="0 0 44 56" role="img" aria-label="Full de cupons">
              <rect class="sheet" x="2" y="2" width="40" height="52" rx="4"></rect>
              <rect class="band" x="6" y="6" width="32" height="7" rx="1.6"></rect>
              <rect class="bandln" x="8.5" y="8.7" width="16" height="1.8" rx=".9"></rect>
              <rect class="coupon" x="6" y="17" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="17.7" y="17" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="29.4" y="17" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="6" y="26" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="17.7" y="26" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="29.4" y="26" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="6" y="35" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="17.7" y="35" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="29.4" y="35" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="6" y="44" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="17.7" y="44" width="8.6" height="6.5" rx="1.2"></rect>
              <rect class="coupon" x="29.4" y="44" width="8.6" height="6.5" rx="1.2"></rect>
            </svg>
            <h1 data-i18n="appTitle">Emplenador de <span class="lo">fulls de cupons precinte</span></h1>
          </div>
          <div class="controls">
            <div class="seg" role="group" aria-label="Idioma">
              <button type="button" data-lang="ca" aria-pressed="false">Català</button>
              <button type="button" data-lang="es" aria-pressed="true">Español</button>
            </div>
            <button type="button" class="theme-switch" id="themeBtn" role="switch" aria-checked="false" aria-label="Tema clar / fosc">
              <span class="ts-knob">
                <svg class="glyph glyph-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
                <svg class="glyph glyph-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>
              </span>
            </button>
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
              <input type="text" class="combo-search" id="colegiSearch" data-i18n-ph="searchPh" placeholder="Cerca…" autocomplete="off" />
              <div class="combo-list" id="colegiList" role="listbox" aria-labelledby="colegiLbl"></div>
            </div>
            <input type="hidden" id="colegi" name="colegi" value="" form="form" />
          </div>
          <span class="field-err" id="err-colegi"></span>
          <div class="field-note colegi-note" id="colegiNote" hidden>
            <span id="colegiNoteText" data-i18n="noTemplate">Encara no tenim la plantilla d'aquest col·legi. Demana-la i l'afegirem perquè la puguis fer servir.</span>
            <button type="button" class="combo-req" id="colegiNoteReq" data-i18n="reqBtn" @click=${() => this.demanar(this.i('colegi').value)}>Demanar</button>
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
                <span class="field-err" id="err-up"></span>
              </div>
              <!-- name="mes"/"num" + type="month" made Chrome read this as a card
                   expiry next to a card number, so it offered credit-card autofill
                   on "Número de fulls". Form-level autocomplete="off" is ignored for
                   that heuristic; names it cannot match are not. Names are inert
                   here — every lookup is by id. -->
              <div class="field">
                <label for="mes" data-i18n="mes">Mes i any</label>
                <input id="mes" name="sheet-period" type="month" autocomplete="off" />
              </div>
              <div class="two-up">
                <div class="field"><label for="full" data-i18n="full">Full inicial</label><input id="full" name="full" type="text" inputmode="numeric" maxlength="4" class="numr" placeholder="1" /><span class="field-err" id="err-full"></span></div>
                <div class="field"><label for="num" data-i18n="num">Número de fulls</label><input id="num" name="sheet-count" type="text" inputmode="numeric" maxlength="4" class="numr" placeholder="50" autocomplete="off" /><span class="field-err" id="err-num"></span></div>
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
                <div class="field"><label for="cognoms" data-i18n="cognoms">Cognoms del titular</label><input id="cognoms" name="cognoms" type="text" disabled /><span class="field-err" id="err-cognoms"></span></div>
                <div class="field"><label for="nom" data-i18n="nom">Nom del titular</label><input id="nom" name="nom" type="text" disabled /><span class="field-err" id="err-nom"></span></div>
                <div class="two-up">
                  <div class="field"><label for="nif" data-i18n="nif">NIF</label><input id="nif" name="nif" type="text" maxlength="9" disabled /><span class="field-err" id="err-nif"></span></div>
                  <div class="field"><label for="cp" data-i18n="cp">Codi postal</label><input id="cp" name="cp" type="text" inputmode="numeric" maxlength="5" class="numr" disabled /><span class="field-err" id="err-cp"></span></div>
                </div>
                <div class="field"><label for="adreca" data-i18n="adreca">Adreça</label><input id="adreca" name="adreca" type="text" disabled /><span class="field-err" id="err-adreca"></span></div>
                <div class="two-up">
                  <div class="field"><label for="poblacio" data-i18n="poblacio">Població</label><input id="poblacio" name="poblacio" type="text" list="pobles" disabled /><datalist id="pobles"></datalist><span class="field-err" id="err-poblacio"></span></div>
                  <div class="field"><label for="provincia" data-i18n="provincia">Província</label>
                    <select id="provincia" name="provincia" disabled>
                      <option value="" data-i18n="provinciaPh" selected>—</option>
                      ${provinces.map((p) => html`<option>${p}</option>`)}
                    </select>
                    <span class="field-err" id="err-provincia"></span>
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

        <div class="page-foot">
          <button type="button" class="linklike" id="contactBtn" data-i18n="contact" @click=${() => this.contactar()}>Contactar</button>
        </div>

        <div class="modal-overlay" id="genModal" hidden>
          <div class="modal" role="alertdialog" aria-modal="true">
            <div class="modal-title gen" data-i18n="genTitle">Generant el document…</div>
            <div class="gen-progress" id="genProgress"><div class="progress-track"><div class="progress-fill" id="genBar"></div></div></div>
            <div class="gen-result" id="genResult" hidden>
              <div class="modal-actions">
                <a class="btn" id="genDownload" href="#" target="_blank" rel="noopener" data-i18n="genDownload">Obrir / Descarregar PDF</a>
                <button type="button" class="btn-ghost" data-i18n="genClose" @click=${() => (this.q('#genModal').hidden = true)}>Tancar</button>
              </div>
            </div>
            <div class="gen-error" id="genError" hidden>
              <p class="modal-msg" id="genErrMsg"></p>
              <div class="modal-actions">
                <button type="button" class="btn-ghost" data-i18n="genClose" @click=${() => (this.q('#genModal').hidden = true)}>Tancar</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div class="privacy-bar" id="privacyBar">
        <div class="privacy-msg" id="privacyMsg">
          <span data-i18n="alertText">Aquesta pàgina no pertany a cap Col·legi de Farmacèutics</span>
          <span class="dot" aria-hidden="true">·</span>
          <span data-i18n="privacy">Les dades es processen al teu ordinador i no s'envien enlloc</span>
          <span class="dot" aria-hidden="true">·</span>
          <span data-i18n="noCookies">El lloc no fa servir cookies</span>
        </div>
        <div class="warn-confirm" id="warnConfirm" hidden>
          <p class="warn-confirm-msg" id="warnMsg"></p>
          <div class="warn-confirm-actions">
            <button type="button" class="btn-ghost" id="warnCancel" data-i18n="cancel">Cancel·lar</button>
            <button type="button" class="btn" id="warnOk" data-i18n="continuar">Continuar</button>
          </div>
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
