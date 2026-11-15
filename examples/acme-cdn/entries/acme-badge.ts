// Acme's own component, next to ui-sdk's in the same CDN. Any custom element works; see src/components/step-grid.ts
// for one composed from ui-sdk core.
class AcmeBadge extends HTMLElement {
  static observedAttributes = ["tone"]

  connectedCallback() {
    this.render()
  }

  attributeChangedCallback() {
    this.render()
  }

  render() {
    this.dataset.slot = "acme-badge"
    this.dataset.tone = this.getAttribute("tone") === "new" ? "new" : "neutral"
  }
}

if (!customElements.get("acme-badge")) customElements.define("acme-badge", AcmeBadge)
