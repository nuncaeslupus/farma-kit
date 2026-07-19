import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/fk-panel';
import '../components/fk-bar';
import '../components/fk-button';
import {
  FIELD_PRESETS,
  defaultStyle,
  slug,
  validateTemplate,
  type Field,
  type Template,
  type FontFamily,
} from '../lib/template';
import { CanvasEngine } from './canvas-engine';
import { generatePdf } from '../lib/pdf/generate';
import { applyStoredTheme, toggleTheme, isDark } from '../lib/theme';

const round = (n: number) => Math.round(n * 100) / 100;
const CSS_PPP = 96 / 72;
// Tab title (brand + tool). The heading shows only the tool name — the FarmaKit
// wordmark sits in the brand row above it.
const TITLE = 'Farma Kit - Template editor';

@customElement('editor-app')
export class EditorApp extends LitElement {
  @state() private fields: Field[] = [];
  @state() private selected: Field | null = null;
  @state() private name = ''; // blank until picked
  @state() private cn = ''; // national code printed on the sheet; '' → omitted
  // Round-tripped only: carried from import to export so a hand-written segell:false
  // survives a re-export. Deliberately no UI — no colegio needs it yet, and what a
  // second one will want (stamp? titular only?) isn't known. Add a control when it is.
  @state() private segell = true;
  @state() private fileName = '';
  @state() private includeSheet = true; // draw the test PDF over the official sheet
  @state() private zoomPct = 100;
  @state() private addKey = FIELD_PRESETS[0].key;
  @state() private snap = true;
  @state() private status = 'Upload the official sheet PDF to begin.';
  // Undo stack of serialised field lists. Fields are plain data, so a JSON round
  // trip is a sound clone and a cheap way to compare states. Depth-capped: this is
  // a tracing tool, not a word processor — 50 steps covers a slip, and the whole
  // stack is throwaway once you export.
  @state() private history: string[] = [];
  @state() private future: string[] = []; // undone states, newest last

  private engine!: CanvasEngine;
  // Gesture's pre-mutation snapshot, held until the gesture proves it changed
  // something — see firstUpdated's onChange/onBeforeChange wiring and onGestureEnd.
  private pending: string | null = null;
  private mouseGesture = false; // a mouse button is down: defer the commit to mouseup
  // Reactive: the "Include official sheet" control enables/disables on it, and it is
  // assigned after an await in onUpload — a plain field would leave the UI stale.
  @state() private pdfBytes: ArrayBuffer | null = null;
  @state() private dark = false;
  @state() private genBusy = false;
  private genUrl: string | null = null;

  firstUpdated() {
    const host = this.renderRoot.querySelector('#canvas-host') as HTMLElement;
    this.engine = new CanvasEngine(host, {
      onSelect: (f) => (this.selected = f),
      onChange: () => {
        // Commit the gesture's pre-state only once something actually mutated:
        // onBeforeChange fires on every mousedown, including selection clicks,
        // and an undo step for a no-op gesture is a Ctrl+Z that does nothing.
        // Mouse gestures defer further, to mouseup (onGestureEnd): committing on
        // the first mousemove would still record a dead step for a drag that
        // returns to its origin. Keyboard nudges have no mouseup, so they commit
        // here, immediately.
        if (this.pending !== null && !this.mouseGesture) {
          this.push(this.pending);
          this.pending = null;
        }
        this.requestUpdate();
      },
      onBeforeChange: () => {
        this.pending = JSON.stringify(this.fields);
      },
      snapEnabled: () => this.snap,
    });
    this.engine.setFields(this.fields);
    this.fit();
  }

  private onToggleTheme = () => {
    toggleTheme();
    this.dark = isDark();
  };

  connectedCallback() {
    super.connectedCallback();
    // A direct load of #editor has no generator to apply the stored theme, so do
    // it here; carried-over dark from an in-app route change is already applied.
    applyStoredTheme();
    this.dark = isDark();
    document.addEventListener('keydown', this.onUndoKey);
    window.addEventListener('mousedown', this.onGestureStart);
    window.addEventListener('mouseup', this.onGestureEnd);
    // The editor owns the tab title only while it is mounted, and nothing here
    // needs to undo it: the generator sets its own title from the i18n dict every
    // time it mounts (applyLang), so routing back restores it. Deliberately not in
    // app-root — that ships, and index.html's title is the indexed/og:title one.
    document.title = TITLE;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onUndoKey);
    window.removeEventListener('mousedown', this.onGestureStart);
    window.removeEventListener('mouseup', this.onGestureEnd);
    this.engine?.destroy();
    if (this.genUrl) URL.revokeObjectURL(this.genUrl);
    this.genUrl = null;
  }

  private onGestureStart = () => {
    this.mouseGesture = true;
  };
  /** End of a mouse gesture: commit its pre-state only if something really moved,
      so a drag released back at its origin leaves no dead undo step. */
  private onGestureEnd = () => {
    this.mouseGesture = false;
    if (this.pending === null) return;
    if (this.pending !== JSON.stringify(this.fields)) this.push(this.pending);
    this.pending = null;
  };

  // ---- undo / redo ----
  private push(snap: string) {
    // Gestures that end where they began (a click, a drag snapped back) leave no
    // visible change — an undo step for one would be a keypress that does nothing.
    if (this.history[this.history.length - 1] === snap) return;
    this.history = [...this.history.slice(-49), snap];
    this.future = []; // editing after an undo forks the timeline; the redos are gone
  }

  /** Record the current fields as an undo step. Call *before* mutating them. */
  private snapshot() {
    this.push(JSON.stringify(this.fields));
  }

  /**
   * Swap the field list for a recorded one, moving the state it replaces onto the
   * opposite stack — that symmetry is what lets undo and redo walk the same steps.
   */
  private travel(from: 'history' | 'future') {
    const src = from === 'history' ? this.history : this.future;
    if (!src.length) return;
    const snap = src[src.length - 1];
    const rest = src.slice(0, -1);
    const current = JSON.stringify(this.fields);
    if (from === 'history') {
      this.history = rest;
      this.future = [...this.future, current];
    } else {
      this.future = rest;
      this.history = [...this.history, current];
    }
    // Restoring replaces every Field object, so the old `selected` reference now
    // points into a discarded array — reselect by key or the panel would edit a
    // field the canvas no longer draws.
    const key = this.selected?.key;
    this.fields = JSON.parse(snap) as Field[];
    this.engine.setFields(this.fields);
    this.engine.setSelected(this.fields.find((f) => f.key === key) ?? null);
  }

  private onUndoKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const redo = (k === 'z' && e.shiftKey) || k === 'y';
    if (k !== 'z' && !redo) return;
    // Let inputs keep their own undo — Ctrl+Z in a text box should fix the typo
    // you just made, not rewind the sheet behind it.
    const active = (e.composedPath()[0] as HTMLElement) ?? document.activeElement;
    if (active && /INPUT|SELECT|TEXTAREA/.test(active.tagName)) return;
    e.preventDefault();
    this.travel(redo ? 'future' : 'history');
  };

  // ---- zoom ----
  private syncZoom() {
    this.zoomPct = Math.round((this.engine.scaleValue / CSS_PPP) * 100);
  }
  private zoom(f: number) {
    this.engine.setScale(Math.max(0.15, Math.min(6, this.engine.scaleValue * f)));
    this.syncZoom();
  }
  /**
   * 'page' fits the whole sheet; 'width' fills the stage across and lets it run
   * off the bottom — the header you are tracing sits in the top fifth of the
   * sheet, so filling the width is what actually magnifies the work.
   */
  private fit(mode: 'page' | 'width' = 'page') {
    const stage = this.renderRoot.querySelector('#stage') as HTMLElement;
    if (!stage) return;
    // Fitting to width brings on the vertical scrollbar, which then narrows the
    // stage — reserve it up front so the sheet doesn't end up a hair too wide.
    const bar = mode === 'width' ? 16 : 0;
    const availH = mode === 'width' ? Infinity : stage.clientHeight - 48;
    this.engine.setScale(this.engine.fitScale(stage.clientWidth - 48 - bar, availH));
    this.syncZoom();
  }

  // ---- source pdf ----
  private async onUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const bytes = await file.arrayBuffer();
      // Only after a successful parse: pdfBytes gates "Include sheet", and a file
      // that failed to load must not present itself as a usable sheet.
      await this.engine.loadPdf(bytes.slice(0));
      this.pdfBytes = bytes;
      this.fileName = file.name;
      this.fit();
      this.status = '';
    } catch {
      this.status = `Could not read "${file.name}" as a PDF.`;
    }
    // Reset so picking the same file again re-fires change after a failure.
    input.value = '';
  }

  // ---- fields ----
  private onAdd() {
    let f: Field;
    if (this.addKey === '__custom') {
      const label = window.prompt('New field name?')?.trim();
      if (!label) return;
      f = mkField(slug(label), label, 1, 'sans', '');
    } else {
      const p = FIELD_PRESETS.find((x) => x.key === this.addKey)!;
      f = mkField(p.key, p.label, p.cells, p.font, p.sample);
    }
    this.snapshot();
    this.fields = [...this.fields, f];
    this.engine.setFields(this.fields);
    this.engine.setSelected(f);
    const avail = FIELD_PRESETS.filter((p) => !this.fields.some((x) => x.key === p.key));
    this.addKey = avail[0]?.key ?? '__custom';
  }
  private removeField(f: Field) {
    this.snapshot();
    this.fields = this.fields.filter((x) => x !== f);
    this.engine.setFields(this.fields);
    if (this.selected === f) this.engine.setSelected(null);
  }

  /** Mutate the selected field, then refresh boxes + panel. */
  private edit(fn: () => void) {
    this.snapshot();
    fn();
    this.engine.drawBoxes();
    this.requestUpdate();
  }
  private num(e: Event) {
    return parseFloat((e.target as HTMLInputElement).value) || 0;
  }

  // ---- output ----
  private template(): Template {
    // cn/segell are template-level config the editor must round-trip: dropping them
    // silently hides the national code line (and the stamp section) in the app.
    // Both are optional in the model, so only emit what differs from the default —
    // keeps re-exports byte-comparable with hand-written templates.
    const cn = this.cn.trim();
    return {
      name: this.name,
      ...(cn ? { cn } : {}),
      ...(this.segell ? {} : { segell: false }),
      sheet: { w: round(this.engine.sheet.w), h: round(this.engine.sheet.h) },
      fields: this.fields.map((f) => ({ ...f, box: { ...f.box } })),
    };
  }
  private async onGenerate() {
    if (!this.fields.length || this.genBusy) return;
    this.genBusy = true;
    this.status = 'Generating…';
    try {
      const data = Object.fromEntries(this.fields.map((f) => [f.key, f.sample ?? '']));
      // With the sheet: checks alignment. Without: exactly what prints onto the paper.
      const base = this.includeSheet && this.pdfBytes ? this.pdfBytes.slice(0) : null;
      const bytes = await generatePdf(this.template(), [data], base);
      // Each run allocates a blob the browser holds until revoked — release the
      // previous one; any tab that opened it has long since loaded its copy.
      if (this.genUrl) URL.revokeObjectURL(this.genUrl);
      this.genUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      let tab: Window | null = null;
      try {
        tab = window.open(this.genUrl, '_blank');
        if (tab) tab.opener = null;
      } catch {
        /* refused — report below instead of failing the run */
      }
      this.status = tab
        ? base
          ? 'Test PDF (over the sheet) opened in a new tab.'
          : 'Test PDF (data only) opened in a new tab.'
        : 'Pop-up blocked — allow pop-ups for this site and try again.';
    } catch (err) {
      this.status = `Could not generate: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      this.genBusy = false;
    }
  }
  private async onImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const tpl = JSON.parse(await file.text()) as Template;
      // Validate the FILE, before the fallbacks below mask its problems: a template
      // with no name would inherit the editor's current one and then "validate"
      // clean. Type-guard the raw values too, so junk can't reach state and turn
      // template() into a landmine.
      const errs = validateTemplate(tpl);
      this.name = typeof tpl?.name === 'string' ? tpl.name : this.name;
      this.cn = typeof tpl?.cn === 'string' ? tpl.cn : '';
      this.segell = tpl?.segell !== false; // absent → true, per the model default
      // Drop junk entries rather than feed them to normalizeField, which reads
      // f.style and dies on a null — the throw would be caught below and reported
      // as "Could not read that JSON", burying the real errors we just collected.
      this.fields = (Array.isArray(tpl?.fields) ? tpl.fields : [])
        .filter((f) => !!f && typeof f === 'object')
        .map(normalizeField);
      // Undo tracks fields only, but an import also swaps name/cn/segell. Stepping
      // across one would graft the old sheet's boxes onto the new sheet's identity,
      // so the imported file is the new floor.
      this.history = [];
      this.future = [];
      // A bad sheet is already reported; don't hand it to the canvas as well.
      // `> 0` alone is not enough: JSON.parse('1e309') yields Infinity, which
      // passes that check and then sizes the canvas to Infinity.
      const dim = (v: unknown, fallback: number) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : fallback;
      };
      this.engine.setSheetSize(dim(tpl?.sheet?.w, 595.28), dim(tpl?.sheet?.h, 841.89));
      this.engine.setFields(this.fields);
      this.engine.setSelected(null);
      this.fit();
      this.addKey = FIELD_PRESETS.filter((p) => !this.fields.some((x) => x.key === p.key))[0]?.key ?? '__custom';
      // Report problems but still load it — the editor is where you come to fix them.
      this.status = errs.length
        ? `Imported ${this.fields.length} fields, but: ${errs.join(' ')}`
        : `Imported ${this.fields.length} fields. Re-upload the sheet PDF to see them over it.`;
    } catch {
      this.status = 'Could not read that JSON.';
    }
    input.value = '';
  }

  private onExport() {
    // Refuse to write a template that can't work: an exported file goes straight
    // into the repo and drives real printing, so a bad one is worse than no file.
    const errs = validateTemplate(this.template());
    if (errs.length) {
      this.status = `Not exported — ${errs.join(' ')}`;
      return;
    }
    const json = JSON.stringify(this.template(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(this.name) || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.status = `Exported ${a.download}`;
  }

  static styles = css`
    * {
      box-sizing: border-box;
    }
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      --rail-left: 300px;
      --rail-right: 328px;
      --bar-pad: 14px;
    }
    .middle {
      flex: 1;
      display: grid;
      grid-template-columns: var(--rail-left) 1fr var(--rail-right);
      overflow: hidden;
    }
    /* The toolbar lives here, not full-width above: it spans only the canvas so
       the two rails rise all the way to the brand row. */
    .center {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    #stage {
      flex: 1;
      overflow: auto;
      background: #6d665a;
      display: grid;
      /* "safe" centring: once the sheet outgrows the stage (zoomed in, or fit to
         width) plain centring overflows in both directions and the top edge
         becomes unreachable by scrolling. "safe" falls back to start-aligned. */
      place-items: safe center;
    }
    .tbar-left,
    .tbar-right {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tbar-right {
      justify-content: flex-end;
    }
    .brandbar {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 10px;
      /* tight vertical padding: the 60px badge (coherent with the generator)
         already sets the bar height, so extra padding only wastes canvas space. */
      padding: 4px var(--bar-pad);
      border-bottom: 1px solid var(--line);
    }
    .app-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-self: start;
    }
    .app-badge {
      border-radius: 12px;
      flex: none;
      display: block;
    }
    .app-name {
      font-family: var(--font-head);
      font-weight: 600;
      font-size: 17px;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .app-name .kit {
      color: var(--accent);
    }
    .theme-btn {
      font-size: 15px;
      line-height: 1;
      width: 30px;
      height: 30px;
      border-radius: 7px;
      border: 1px solid var(--line);
      background: var(--surface-2);
      color: var(--ink);
      cursor: pointer;
      justify-self: end;
    }
    h1 {
      font-family: var(--font-head);
      font-weight: 600;
      font-size: 16px;
      margin: 0;
      white-space: nowrap;
      justify-self: center;
    }
    .hist {
      display: flex;
      gap: 4px;
    }
    .hist fk-button::part(button) {
      font-size: 15px;
      padding: 6px 10px;
    }
    /* The checkbox is an option *of* Generate, not a sibling action — box them
       together so the pairing survives without a caption saying so. */
    .gen {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px;
      padding-right: 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-2);
    }
    .zoom {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .zoom .pct {
      font-family: var(--font-mono);
      min-width: 46px;
      text-align: center;
    }
    .zoom fk-button::part(button) {
      padding: 6px 9px;
    }
    .zoom fk-button svg {
      display: block;
    }
    .divider {
      margin: 20px 0 0;
      border-top: 1px solid var(--line);
    }
    .tpl-card {
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 2px 12px 12px;
    }
    .tpl-card .fld:first-child {
      margin-top: 8px;
    }
    h2.workbench {
      margin-top: 24px;
    }
    label.fld {
      display: block;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--muted);
      margin: 10px 0 4px;
    }
    .filebtn {
      display: inline-block;
      cursor: pointer;
    }
    .filebtn input {
      display: none;
    }
    .filebtn .fake {
      display: inline-block;
      font-family: var(--font-head);
      font-weight: 600;
      font-size: 13px;
      padding: 8px 14px;
      border-radius: var(--radius);
      background: var(--surface-2);
      color: var(--ink);
      border: 1px solid var(--line);
    }
    .filename {
      margin-top: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--faint);
      font-size: 12px;
    }
    input[type='text'],
    input[type='number'],
    select {
      font: inherit;
      font-size: 13px;
      background: var(--field-bg);
      border: 1px solid var(--field-line);
      border-radius: var(--radius);
      color: var(--ink);
      padding: 6px 10px;
      width: 100%;
    }
    select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 34px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%236d665a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>');
      background-repeat: no-repeat;
      background-position: right 12px center;
    }
    .li {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      margin-bottom: 5px;
      border: 1px solid var(--line-2);
      border-radius: 7px;
      cursor: pointer;
      background: var(--field-bg);
    }
    .li.sel {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .li .k {
      flex: 1;
    }
    .li .x {
      color: var(--danger);
      font-weight: 700;
      padding: 0 3px;
    }
    .selname {
      font-family: var(--font-head);
      font-weight: 700;
      font-size: 13px;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .g2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .checks {
      display: flex;
      gap: 16px;
      margin-top: 6px;
    }
    .checks label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--ink);
    }
    .checks input,
    .snap input {
      width: auto;
    }
    .snap {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 6px;
      font-size: 12.5px;
    }
    .muted {
      color: var(--faint);
      font-size: 11.5px;
      line-height: 1.45;
    }
    .status {
      font-size: 11px;
      color: var(--faint);
      margin-top: 8px;
    }
    .incl {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--ink);
      white-space: nowrap;
      cursor: pointer;
    }
    .incl input {
      margin: 0;
      cursor: pointer;
    }
    /* no sheet uploaded → nothing to include */
    .incl.off,
    .incl.off input {
      color: var(--faint);
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <div class="brandbar">
        <div class="app-brand">
          <img class="app-badge" src="${import.meta.env.BASE_URL}brand/farmakit-badge.svg" alt="" width="60" height="60" />
          <span class="app-name">Farma<span class="kit">Kit</span></span>
        </div>
        <h1>Template editor</h1>
        <button
          type="button"
          class="theme-btn"
          title="Light / dark"
          aria-label="Light / dark"
          @click=${this.onToggleTheme}
        >
          ${this.dark ? '☀' : '☾'}
        </button>
      </div>

      <div class="middle">
        <fk-panel side="left">
          <h2>Template</h2>
          <div class="tpl-card">
            <label class="fld">Official sheet PDF</label>
            <label class="filebtn">
              <input type="file" accept="application/pdf" @change=${this.onUpload} />
              <span class="fake">Upload PDF…</span>
            </label>
            <div class="filename" title=${this.fileName}>${this.fileName || 'No file selected'}</div>
            <label class="filebtn">
              <input type="file" accept="application/json,.json" @change=${this.onImport} />
              <span class="fake">Import JSON…</span>
            </label>
            <label class="fld">Template name</label>
            <input
              type="text"
              placeholder="e.g. Catalunya"
              .value=${this.name}
              @input=${(e: Event) => (this.name = (e.target as HTMLInputElement).value)}
            />
            <div class="muted">→ <b>templates/${slug(this.name) || 'template'}.json</b></div>
            <label class="fld">National Code (CN)</label>
            <input
              type="text"
              placeholder="e.g. 140663 — blank to hide"
              .value=${this.cn}
              @change=${(e: Event) => (this.cn = (e.target as HTMLInputElement).value)}
            />
          </div>

          <h2 class="workbench">Fields</h2>
          <select .value=${this.addKey} @change=${(e: Event) => (this.addKey = (e.target as HTMLSelectElement).value)}>
            ${FIELD_PRESETS.filter((p) => !this.fields.some((f) => f.key === p.key)).map(
              (p) => html`<option value=${p.key}>${p.label}</option>`,
            )}
            <option value="__custom">Custom field…</option>
          </select>
          <fk-button variant="ghost" style="margin-top:8px" @click=${() => this.onAdd()}>Add field</fk-button>

          <div class="divider"></div>
          <div style="margin-top:14px">
            ${this.fields.map(
              (f) => html`
                <div class="li ${f === this.selected ? 'sel' : ''}" @click=${() => this.engine.setSelected(f)}>
                  <span class="k">${f.label}</span>
                  <span class="x" @click=${(e: Event) => {
                    e.stopPropagation();
                    this.removeField(f);
                  }}>✕</span>
                </div>
              `,
            )}
          </div>
        </fk-panel>

        <div class="center">
          <fk-bar edge="top">
            <div class="tbar-left">
              <div class="hist">
                <fk-button
                  variant="ghost"
                  ?disabled=${!this.history.length}
                  title="Undo (Ctrl+Z)"
                  label="Undo (Ctrl+Z)"
                  @click=${() => this.travel('history')}
                  >↶</fk-button
                >
                <fk-button
                  variant="ghost"
                  ?disabled=${!this.future.length}
                  title="Redo (Ctrl+Shift+Z)"
                  label="Redo (Ctrl+Shift+Z)"
                  @click=${() => this.travel('future')}
                  >↷</fk-button
                >
              </div>
            </div>
            <div class="zoom">
              <fk-button variant="ghost" label="Zoom out" @click=${() => this.zoom(1 / 1.2)}>−</fk-button>
              <span class="pct">${this.zoomPct}%</span>
              <fk-button variant="ghost" label="Zoom in" @click=${() => this.zoom(1.2)}>+</fk-button>
              <fk-button variant="ghost" title="Fit the whole sheet" label="Fit the whole sheet" @click=${() => this.fit()}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M12 11V7.8"></path><path d="M10.4 9.2 12 7.6 13.6 9.2"></path><path d="M12 13v3.2"></path><path d="M10.4 14.8 12 16.4 13.6 14.8"></path><path d="M11 12H7.8"></path><path d="M9.2 10.4 7.6 12 9.2 13.6"></path><path d="M13 12h3.2"></path><path d="M14.8 10.4 16.4 12 14.8 13.6"></path></svg>
              </fk-button>
              <fk-button variant="ghost" title="Fill the stage across" label="Fill the stage across" @click=${() => this.fit('width')}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M7.3 12h9.4"></path><path d="M9.1 10.2 7.3 12 9.1 13.8"></path><path d="M14.9 10.2 16.7 12 14.9 13.8"></path></svg>
              </fk-button>
            </div>
            <div class="tbar-right">
              <div class="gen">
                <fk-button
                  variant="ghost"
                  ?disabled=${!this.fields.length || this.genBusy}
                  title=${this.fields.length ? 'Draw a test PDF' : 'Add a field first'}
                  @click=${() => this.onGenerate()}
                  >Generate PDF</fk-button
                >
                <label
                  class="incl ${this.pdfBytes ? '' : 'off'}"
                  title=${this.pdfBytes
                    ? 'Draw the data over the official sheet (alignment check). Untick for the data only — what actually prints onto the physical sheet.'
                    : 'Upload the official sheet PDF first.'}
                  ><input
                    type="checkbox"
                    .checked=${this.includeSheet && !!this.pdfBytes}
                    ?disabled=${!this.pdfBytes}
                    @change=${(e: Event) => (this.includeSheet = (e.target as HTMLInputElement).checked)}
                  />
                  Include sheet</label
                >
              </div>
              <fk-button @click=${() => this.onExport()}>Export JSON</fk-button>
            </div>
          </fk-bar>
          <div id="stage"><div id="canvas-host"></div></div>
        </div>

        <fk-panel side="right">
          <h2>Selected field</h2>
          ${this.selected ? this.renderProps(this.selected) : html`<p class="muted">Nothing selected. Add a field or click a box on the sheet.</p>`}
          <div class="divider"></div>
          <div class="snap">
            <input type="checkbox" .checked=${this.snap} @change=${(e: Event) => (this.snap = (e.target as HTMLInputElement).checked)} />
            Snap to other fields
          </div>
          <div class="status">${this.status}</div>
        </fk-panel>
      </div>
    `;
  }

  private renderProps(f: Field) {
    return html`
      <div class="selname">${f.label}</div>
      <div class="g2">
        <div><label class="fld">X</label><input type="number" step="0.5" .value=${round(f.box.x)} @change=${(e: Event) => this.edit(() => (f.box.x = this.num(e)))} /></div>
        <div><label class="fld">Y</label><input type="number" step="0.5" .value=${round(f.box.y)} @change=${(e: Event) => this.edit(() => (f.box.y = this.num(e)))} /></div>
        <div><label class="fld">Width</label><input type="number" step="0.5" .value=${round(f.box.w)} @change=${(e: Event) => this.edit(() => (f.box.w = Math.max(6, this.num(e))))} /></div>
        <div><label class="fld">Height</label><input type="number" step="0.5" .value=${round(f.box.h)} @change=${(e: Event) => this.edit(() => (f.box.h = Math.max(6, this.num(e))))} /></div>
      </div>
      <label class="fld">Placeholder</label>
      <input type="text" .value=${f.sample ?? ''} @input=${(e: Event) => this.edit(() => (f.sample = (e.target as HTMLInputElement).value))} />
      <div class="g2">
        <div>
          <label class="fld">Font</label>
          <select .value=${f.style.font} @change=${(e: Event) => this.edit(() => (f.style.font = (e.target as HTMLSelectElement).value as FontFamily))}>
            <option value="mono">Mono</option>
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
          </select>
        </div>
        <div><label class="fld">Size</label><input type="number" step="0.5" .value=${f.style.size} @change=${(e: Event) => this.edit(() => (f.style.size = this.num(e) || 12))} /></div>
      </div>
      <div class="checks">
        <label><input type="checkbox" .checked=${f.style.bold} @change=${(e: Event) => this.edit(() => (f.style.bold = (e.target as HTMLInputElement).checked))} /> Bold</label>
        <label><input type="checkbox" .checked=${f.style.italic} @change=${(e: Event) => this.edit(() => (f.style.italic = (e.target as HTMLInputElement).checked))} /> Italic</label>
      </div>
      <div class="g2">
        <div>
          <label class="fld">H-Align</label>
          <select .value=${f.style.halign} @change=${(e: Event) => this.edit(() => (f.style.halign = (e.target as HTMLSelectElement).value as Field['style']['halign']))}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label class="fld">V-Align</label>
          <select .value=${f.style.valign} @change=${(e: Event) => this.edit(() => (f.style.valign = (e.target as HTMLSelectElement).value as Field['style']['valign']))}>
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
            <option value="baseline">Baseline</option>
          </select>
        </div>
      </div>
      <label class="fld">Cells</label>
      <input type="number" min="1" step="1" .value=${f.cells} @change=${(e: Event) => this.edit(() => (f.cells = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1)))} />
      <fk-button variant="ghost" style="margin-top:12px;width:100%" @click=${() => this.removeField(f)}>Delete field</fk-button>
    `;
  }
}

function mkField(key: string, label: string, cells: number, font: FontFamily, sample: string): Field {
  const style = defaultStyle(font);
  if (cells > 1) style.halign = 'center'; // multi-cell fields center each digit by default
  return {
    key,
    label,
    box: { x: 60, y: 60, w: cells > 1 ? cells * 18 : 130, h: 16 },
    cells,
    style,
    sample,
  };
}

/** Coerce a parsed JSON field into a valid Field (maintainer files are trusted but tidied). */
function normalizeField(f: Partial<Field>): Field {
  const rawFont = f.style?.font;
  const font: FontFamily = rawFont === 'mono' || rawFont === 'serif' ? rawFont : 'sans';
  const style = { ...defaultStyle(font), ...(f.style ?? {}), font };
  return {
    key: String(f.key ?? ''),
    label: String(f.label ?? f.key ?? ''),
    box: {
      x: Number(f.box?.x) || 0,
      y: Number(f.box?.y) || 0,
      w: Number(f.box?.w) || 60,
      h: Number(f.box?.h) || 16,
    },
    cells: Math.max(1, Math.round(Number(f.cells)) || 1),
    style,
    sample: f.sample != null ? String(f.sample) : '',
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-app': EditorApp;
  }
}
