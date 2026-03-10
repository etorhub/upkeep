/**
 * Mock Home Assistant custom elements for Storybook.
 * ha-card and ha-icon are provided by HA in production; we define minimal shims here.
 */

const HA_CARD_STYLE = `
  :host {
    display: block;
    background: var(--card-background-color, var(--ha-card-background, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.1));
    overflow: hidden;
  }
`;

class MockHaCard extends HTMLElement {
  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = HA_CARD_STYLE;
    const slot = document.createElement('slot');
    shadow.appendChild(style);
    shadow.appendChild(slot);
  }
}

const HA_ICON_STYLE = `
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .icon {
    font-family: "Material Design Icons";
    font-size: var(--mdc-icon-size, 24px);
    width: 1em;
    height: 1em;
    font-style: normal;
  }
`;

function iconToMdiClass(icon: string): string {
  if (!icon) return '';
  return `mdi mdi-${icon.replace(':', '-')}`;
}

class MockHaIcon extends HTMLElement {
  static get observedAttributes() {
    return ['icon'];
  }

  private _icon = '';

  get icon(): string {
    return this._icon;
  }

  set icon(value: string) {
    this._icon = value ?? '';
    this._updateIcon();
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = HA_ICON_STYLE;
    const span = document.createElement('span');
    span.className = 'icon';
    shadow.appendChild(style);
    shadow.appendChild(span);
    this._span = span;
  }

  private _span!: HTMLSpanElement;

  connectedCallback(): void {
    this._updateIcon();
  }

  attributeChangedCallback(): void {
    this._icon = this.getAttribute('icon') ?? '';
    this._updateIcon();
  }

  private _updateIcon(): void {
    if (!this._span) return;
    const icon = this._icon || this.getAttribute('icon') || '';
    this._span.className = `icon ${iconToMdiClass(icon)}`;
  }
}

export function registerMockElements(): void {
  if (!customElements.get('ha-card')) {
    customElements.define('ha-card', MockHaCard);
  }
  if (!customElements.get('ha-icon')) {
    customElements.define('ha-icon', MockHaIcon);
  }
}
