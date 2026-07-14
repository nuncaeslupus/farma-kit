import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** Full-height side panel (left/right rails of the editor shell). */
@customElement('fk-panel')
export class FkPanel extends LitElement {
  @property({ reflect: true }) side: 'left' | 'right' = 'left';

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: auto;
      padding: 14px;
      background: var(--surface);
    }
    :host([side='left']) {
      border-right: 1px solid var(--line);
    }
    :host([side='right']) {
      border-left: 1px solid var(--line);
    }
    ::slotted(h2) {
      font-family: var(--font-head);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--faint);
      margin: 14px 0 7px;
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fk-panel': FkPanel;
  }
}
