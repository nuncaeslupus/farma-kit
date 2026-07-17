import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** Shared button. variant: primary (accent) | ghost (neutral). */
@customElement('fk-button')
export class FkButton extends LitElement {
  @property({ reflect: true }) variant: 'primary' | 'ghost' = 'primary';
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = css`
    :host {
      display: inline-block;
    }
    button {
      font-family: var(--font-head);
      font-weight: 600;
      font-size: 13px;
      padding: 8px 14px;
      border-radius: var(--radius);
      cursor: pointer;
      white-space: nowrap;
      border: 1px solid var(--accent-ink);
      background: var(--accent);
      color: #fff;
    }
    :host([variant='ghost']) button {
      background: var(--surface-2);
      color: var(--ink);
      border-color: var(--line);
    }
    :host([disabled]) button {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`<button part="button" ?disabled=${this.disabled}><slot></slot></button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fk-button': FkButton;
  }
}
