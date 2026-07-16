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
import { COLEGIOS } from '../lib/colegios';

const round = (n: number) => Math.round(n * 100) / 100;
const CSS_PPP = 96 / 72;

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
  @state() private zoomPct = 100;
  @state() private addKey = FIELD_PRESETS[0].key;
  @state() private snap = true;
  @state() private status = 'Upload the official sheet PDF to begin.';

  private engine!: CanvasEngine;
  private pdfBytes: ArrayBuffer | null = null;

  firstUpdated() {
    const host = this.renderRoot.querySelector('#canvas-host') as HTMLElement;
    this.engine = new CanvasEngine(host, {
      onSelect: (f) => (this.selected = f),
      onChange: () => this.requestUpdate(),
      snapEnabled: () => this.snap,
    });
    this.engine.setFields(this.fields);
    this.fit();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.engine?.destroy();
  }

  // ---- zoom ----
  private syncZoom() {
    this.zoomPct = Math.round((this.engine.scaleValue / CSS_PPP) * 100);
  }
  private zoom(f: number) {
    this.engine.setScale(Math.max(0.15, Math.min(6, this.engine.scaleValue * f)));
    this.syncZoom();
  }
  private fit() {
    const stage = this.renderRoot.querySelector('#stage') as HTMLElement;
    if (!stage) return;
    this.engine.setScale(this.engine.fitScale(stage.clientWidth - 48, stage.clientHeight - 48));
    this.syncZoom();
  }

  // ---- source pdf ----
  private async onUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileName = file.name;
    this.pdfBytes = await file.arrayBuffer();
    await this.engine.loadPdf(this.pdfBytes.slice(0));
    this.fit();
    this.status = '';
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
    this.fields = [...this.fields, f];
    this.engine.setFields(this.fields);
    this.engine.setSelected(f);
    const avail = FIELD_PRESETS.filter((p) => !this.fields.some((x) => x.key === p.key));
    this.addKey = avail[0]?.key ?? '__custom';
  }
  private removeField(f: Field) {
    this.fields = this.fields.filter((x) => x !== f);
    this.engine.setFields(this.fields);
    if (this.selected === f) this.engine.setSelected(null);
  }

  /** Mutate the selected field, then refresh boxes + panel. */
  private edit(fn: () => void) {
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
    if (!this.fields.length) return;
    this.status = 'Generating…';
    const data = Object.fromEntries(this.fields.map((f) => [f.key, f.sample ?? '']));
    const bytes = await generatePdf(this.template(), [data], this.pdfBytes ? this.pdfBytes.slice(0) : null);
    window.open(URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })), '_blank');
    this.status = 'Test PDF opened in a new tab.';
  }
  private async onImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const tpl = JSON.parse(await file.text()) as Template;
      this.name = tpl.name ?? this.name;
      this.cn = tpl.cn ?? '';
      this.segell = tpl.segell !== false; // absent → true, per the model default
      this.fields = (tpl.fields ?? []).map(normalizeField);
      this.engine.setSheetSize(tpl.sheet?.w ?? 595.28, tpl.sheet?.h ?? 841.89);
      this.engine.setFields(this.fields);
      this.engine.setSelected(null);
      this.fit();
      this.addKey = FIELD_PRESETS.filter((p) => !this.fields.some((x) => x.key === p.key))[0]?.key ?? '__custom';
      // Report problems but still load it — the editor is where you come to fix them.
      const errs = validateTemplate(this.template());
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
    }
    .middle {
      flex: 1;
      display: grid;
      grid-template-columns: 264px 1fr 288px;
      overflow: hidden;
    }
    #stage {
      overflow: auto;
      background: #6d665a;
      display: grid;
      place-items: center;
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
    h1 {
      font-family: var(--font-head);
      font-size: 15px;
      margin: 0;
      white-space: nowrap;
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
  `;

  render() {
    return html`
      <fk-bar edge="top">
        <div class="tbar-left"><h1>Farma-Kit · Templates</h1></div>
        <div class="zoom">
          <fk-button variant="ghost" @click=${() => this.zoom(1 / 1.2)}>−</fk-button>
          <span class="pct">${this.zoomPct}%</span>
          <fk-button variant="ghost" @click=${() => this.zoom(1.2)}>+</fk-button>
          <fk-button variant="ghost" @click=${() => this.fit()}>Fit</fk-button>
        </div>
        <div class="tbar-right">
          <fk-button @click=${() => this.onGenerate()}>Generate test PDF</fk-button>
          <input type="file" accept="application/json,.json" id="jsonInput" style="display:none" @change=${this.onImport} />
          <fk-button variant="ghost" @click=${() => (this.renderRoot.querySelector('#jsonInput') as HTMLElement).click()}>Import JSON</fk-button>
          <fk-button variant="ghost" @click=${() => this.onExport()}>Export JSON</fk-button>
        </div>
      </fk-bar>

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
            <label class="fld">Colegio</label>
            <select .value=${this.name} @change=${(e: Event) => (this.name = (e.target as HTMLSelectElement).value)}>
              <option value="">—</option>
              ${COLEGIOS.map(
                (g) => html`<optgroup label=${g.region}>
                  ${g.colegios.map((c) => html`<option value=${c}>${c}</option>`)}
                </optgroup>`,
              )}
            </select>
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

        <div id="stage"><div id="canvas-host"></div></div>

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
