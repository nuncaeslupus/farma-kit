import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './generator/generator-app';

// The template editor is a maintainer-only, OFFLINE tool: it lives in the repo
// but is never shipped online. This dynamic import is dead code in a production
// build (import.meta.env.DEV is statically false), so the bundler drops the
// editor entirely — the deployed site has no #editor route at all.
if (import.meta.env.DEV) void import('./editor/editor-app');

/**
 * Root router. Default view is the pharmacy-facing generator. The template
 * editor is reachable only when running the dev server (`npm run dev` → #editor).
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
    return import.meta.env.DEV && this.route.startsWith('#editor')
      ? html`<editor-app></editor-app>`
      : html`<generator-app></generator-app>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fk-root': FkRoot;
  }
}
