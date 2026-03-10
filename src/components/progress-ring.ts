import { LitElement, html, css, svg, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('hm-progress-ring')
export class ProgressRing extends LitElement {
  @property({ type: Number }) progress = 0;
  @property({ type: String }) color = 'var(--primary-color)';
  @property({ type: Number }) size = 48;
  @property({ type: Number }) strokeWidth = 4;

  protected render(): TemplateResult {
    const radius = (this.size - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(this.progress, 100);
    const offset = circumference - (clamped / 100) * circumference;
    const center = this.size / 2;
    const displayPct = Math.min(this.progress, 999);

    return html`
      <svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}">
        ${svg`
          <circle
            class="track"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="var(--divider-color, #e0e0e0)"
            stroke-width="${this.strokeWidth}"
          />
          <circle
            class="progress"
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="${this.color}"
            stroke-width="${this.strokeWidth}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            stroke-linecap="round"
            transform="rotate(-90 ${center} ${center})"
          />
          <text
            x="${center}"
            y="${center}"
            text-anchor="middle"
            dominant-baseline="central"
            class="pct-text"
            fill="var(--primary-text-color)"
          >${displayPct}%</text>
        `}
      </svg>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .progress {
        transition:
          stroke-dashoffset 0.6s ease,
          stroke 0.3s ease;
      }
      .pct-text {
        font-size: 11px;
        font-weight: 600;
      }
    `;
  }
}
