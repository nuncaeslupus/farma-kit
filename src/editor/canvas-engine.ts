import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Field } from '../lib/template';
import { FONT_CSS } from '../lib/pdf/fonts';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface EngineHost {
  onSelect(field: Field | null): void;
  onChange(): void; // a field's box was mutated (drag/resize/nudge)
  // Fired once per gesture, before the first mutation — the host's undo snapshot
  // point. A drag fires onChange on every mousemove, so snapshotting there would
  // bury the pre-drag state under a hundred identical steps.
  onBeforeChange(): void;
  snapEnabled(): boolean;
}

/**
 * Axis a Shift-constrained drag should freeze, or null when unconstrained.
 * Compares the total offset from the drag origin, so it holds whether Shift went
 * down before the drag or midway through it, and re-decides as the drag turns.
 */
export function lockAxis(dx: number, dy: number, shift: boolean): 'x' | 'y' | null {
  if (!shift) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'y' : 'x';
}

const BOX_STYLE = `
  .fbox{position:absolute;border:1.4px solid rgba(15,93,92,.9);background:rgba(15,93,92,.08);cursor:move;user-select:none;display:flex;box-sizing:border-box}
  .fbox.sel{border-color:#b23b2e;background:rgba(178,59,46,.10);z-index:5}
  .fcell{flex:1 1 0;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;color:#0f5d5c}
  .fbox.sel .fcell{color:#b23b2e}
  .fcell + .fcell{border-left:1px dashed rgba(15,93,92,.45)}
  .fbox.sel .fcell + .fcell{border-left-color:rgba(178,59,46,.45)}
  .flbl{position:absolute;top:-15px;left:0;font:600 9px 'Space Grotesk',sans-serif;color:#fff;background:#0f5d5c;padding:1px 4px;border-radius:3px;white-space:nowrap;z-index:2}
  .fbox.sel .flbl{background:#b23b2e}
  .fhnd{position:absolute;right:-5px;bottom:-5px;width:11px;height:11px;background:#b23b2e;border:1px solid #fff;cursor:nwse-resize;z-index:3}
`;

/** Framework-agnostic canvas editor: renders the sheet + draggable field boxes. */
export class CanvasEngine {
  readonly sheet = { w: 595.28, h: 841.89 };
  private wrap: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private overlay: HTMLDivElement;
  private page: pdfjs.PDFPageProxy | null = null;
  private scale = 1;
  private fields: Field[] = [];
  private selected: Field | null = null;
  private boxes = new Map<Field, HTMLDivElement>();

  constructor(
    host: HTMLElement,
    private cb: EngineHost,
  ) {
    host.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = BOX_STYLE;
    this.wrap = document.createElement('div');
    Object.assign(this.wrap.style, {
      position: 'relative',
      background: '#fff',
      boxShadow: '0 4px 22px rgba(0,0,0,.4)',
    });
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, { position: 'absolute', inset: '0' });
    this.wrap.append(this.canvas, this.overlay);
    host.append(style, this.wrap);

    this.overlay.addEventListener('mousedown', (e) => {
      if (e.target === this.overlay) this.setSelected(null);
    });
    document.addEventListener('keydown', this.onKey);
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKey);
  }

  setFields(fields: Field[]): void {
    this.fields = fields;
    this.drawBoxes();
  }

  setSelected(field: Field | null): void {
    this.selected = field;
    this.drawBoxes();
    this.cb.onSelect(field);
  }

  get scaleValue(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    this.scale = scale;
    void this.render();
  }

  /** Scale that fits the sheet inside availW × availH (points → px). */
  fitScale(availW: number, availH: number): number {
    const s = Math.min(availW / this.sheet.w, availH / this.sheet.h);
    return isFinite(s) && s > 0 ? s : 1;
  }

  /** Set sheet dimensions from an imported template when no PDF is loaded. */
  setSheetSize(w: number, h: number): void {
    if (this.page) return; // a loaded PDF defines the real sheet
    this.sheet.w = w;
    this.sheet.h = h;
    void this.render();
  }

  async loadPdf(bytes: ArrayBuffer): Promise<void> {
    const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
    this.page = await doc.getPage(1);
    const v1 = this.page.getViewport({ scale: 1 });
    this.sheet.w = v1.width;
    this.sheet.h = v1.height;
    await this.render();
  }

  async render(): Promise<void> {
    if (this.page) {
      const vp = this.page.getViewport({ scale: this.scale });
      this.canvas.width = vp.width;
      this.canvas.height = vp.height;
      this.sizeWrap(vp.width, vp.height);
      const ctx = this.canvas.getContext('2d')!;
      await this.page.render({ canvasContext: ctx, viewport: vp }).promise;
    } else {
      const w = this.sheet.w * this.scale;
      const h = this.sheet.h * this.scale;
      this.canvas.width = w;
      this.canvas.height = h;
      this.sizeWrap(w, h);
      const ctx = this.canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    }
    this.drawBoxes();
  }

  private sizeWrap(w: number, h: number): void {
    this.wrap.style.width = `${w}px`;
    this.wrap.style.height = `${h}px`;
  }

  /** Rebuild the box layer from the field list. */
  drawBoxes(): void {
    this.boxes.clear();
    this.overlay.querySelectorAll('.fbox').forEach((n) => n.remove());
    for (const f of this.fields) {
      const el = this.makeBox(f);
      this.boxes.set(f, el);
      this.overlay.appendChild(el);
    }
  }

  /** Move an existing box element in place (no rebuild) — used during drag. */
  private positionBox(f: Field): void {
    const el = this.boxes.get(f);
    if (!el) return;
    el.style.left = `${f.box.x * this.scale}px`;
    el.style.top = `${f.box.y * this.scale}px`;
    el.style.width = `${f.box.w * this.scale}px`;
    el.style.height = `${f.box.h * this.scale}px`;
  }

  private makeBox(f: Field): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'fbox' + (f === this.selected ? ' sel' : '');
    Object.assign(el.style, {
      left: `${f.box.x * this.scale}px`,
      top: `${f.box.y * this.scale}px`,
      width: `${f.box.w * this.scale}px`,
      height: `${f.box.h * this.scale}px`,
    });
    const lbl = document.createElement('span');
    lbl.className = 'flbl';
    lbl.textContent = f.label;
    el.appendChild(lbl);

    const n = f.cells > 1 ? f.cells : 1;
    const sample = f.sample ?? '';
    const chars = n > 1 ? [...sample] : [sample];
    for (let i = 0; i < n; i++) {
      const cell = document.createElement('span');
      cell.className = 'fcell';
      Object.assign(cell.style, {
        fontFamily: FONT_CSS[f.style.font],
        fontSize: `${f.style.size * this.scale}px`,
        fontWeight: f.style.bold ? '700' : '400',
        fontStyle: f.style.italic ? 'italic' : 'normal',
        justifyContent:
          f.style.halign === 'center' ? 'center' : f.style.halign === 'right' ? 'flex-end' : 'flex-start',
        alignItems:
          f.style.valign === 'top'
            ? 'flex-start'
            : f.style.valign === 'bottom' || f.style.valign === 'baseline'
              ? 'flex-end'
              : 'center',
      });
      cell.textContent = chars[i] ?? '';
      el.appendChild(cell);
    }

    const hnd = document.createElement('span');
    hnd.className = 'fhnd';
    el.appendChild(hnd);

    el.addEventListener('mousedown', (e) => this.startDrag(e, f));
    hnd.addEventListener('mousedown', (e) => this.startResize(e, f));
    return el;
  }

  private snap(v: number, cands: number[]): number {
    if (!this.cb.snapEnabled()) return v;
    const t = 5 / this.scale;
    for (const c of cands) if (Math.abs(v - c) < t) return c;
    return v;
  }
  private edges(axis: 'x' | 'y', except: Field): number[] {
    const out: number[] = [];
    for (const f of this.fields) {
      if (f === except) continue;
      if (axis === 'x') out.push(f.box.x, f.box.x + f.box.w);
      else out.push(f.box.y, f.box.y + f.box.h);
    }
    return out;
  }

  private startDrag(e: MouseEvent, f: Field): void {
    if ((e.target as HTMLElement).classList.contains('fhnd')) return;
    e.preventDefault();
    this.setSelected(f);
    this.cb.onBeforeChange();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = f.box.x;
    const oy = f.box.y;
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - sx) / this.scale;
      const dy = (ev.clientY - sy) / this.scale;
      const lock = lockAxis(dx, dy, ev.shiftKey);
      // Hold the frozen axis at its origin rather than snapping it: snap() would
      // pull a locked coordinate onto a neighbour's edge and break the constraint.
      f.box.x = lock === 'x' ? ox : Math.max(0, this.snap(ox + dx, this.edges('x', f)));
      f.box.y = lock === 'y' ? oy : Math.max(0, this.snap(oy + dy, this.edges('y', f)));
      this.positionBox(f);
      this.cb.onChange();
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  private startResize(e: MouseEvent, f: Field): void {
    e.preventDefault();
    e.stopPropagation();
    this.setSelected(f);
    this.cb.onBeforeChange();
    const sx = e.clientX;
    const sy = e.clientY;
    const ow = f.box.w;
    const oh = f.box.h;
    const move = (ev: MouseEvent) => {
      const rightEdges = this.edges('x', f);
      const bottomEdges = this.edges('y', f);
      f.box.w = Math.max(6, this.snap(f.box.x + ow + (ev.clientX - sx) / this.scale, rightEdges) - f.box.x);
      f.box.h = Math.max(6, this.snap(f.box.y + oh + (ev.clientY - sy) / this.scale, bottomEdges) - f.box.y);
      this.positionBox(f);
      this.cb.onChange();
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.selected) return;
    const active = (e.composedPath()[0] as HTMLElement) ?? document.activeElement;
    if (active && /INPUT|SELECT|TEXTAREA/.test(active.tagName)) return;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = d[e.key];
    if (!step) return;
    e.preventDefault();
    this.cb.onBeforeChange();
    const px = e.shiftKey ? 10 : 1;
    this.selected.box.x = Math.max(0, this.selected.box.x + step[0] * px);
    this.selected.box.y = Math.max(0, this.selected.box.y + step[1] * px);
    this.positionBox(this.selected);
    this.cb.onChange();
  };
}
