import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './generator/generator-app';
import './editor/editor-app';

/**
 * Root router. Default view is the pharmacy-facing generator. The template
 * editor is a maintainer-only tool reachable ONLY via the unlinked #editor
 * hash (obscurity, no login — it holds no secrets and only emits JSON).
 */
@customElement('fk-root')
export class FkRoot extends LitElement {
  @state() private route = location.hash;

  // Light DOM so the generator (also light DOM) lives in the document where the
  // global app.css applies; the editor uses its own shadow-DOM components.
  protected createRenderRoot() {
    return this;
  }

  private onHash = () => (this.route = location.hash);

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
  }
  disconnectedCallback() {
    window.removeEventListener('hashchange', this.onHash);
    super.disconnectedCallback();
  }

  render() {
    return this.route.startsWith('#editor')
      ? html`<editor-app></editor-app>`
      : html`<generator-app></generator-app>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fk-root': FkRoot;
  }
}
