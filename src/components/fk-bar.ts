import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** Horizontal bar for the top/bottom strips over the canvas column. */
@customElement('fk-bar')
export class FkBar extends LitElement {
  @property({ reflect: true }) edge: 'top' | 'bottom' = 'top';

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      background: var(--surface);
    }
    :host([edge='top']) {
      border-bottom: 1px solid var(--line);
    }
    :host([edge='bottom']) {
      border-top: 1px solid var(--line);
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fk-bar': FkBar;
  }
}
