import { LitElement, html, css, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { TaskData } from '../types';
import { URGENCY_COLORS } from '../const';
import { localize } from '../localize/localize';

@customElement('hm-summary-header')
export class SummaryHeader extends LitElement {
  @property({ attribute: false }) tasks: TaskData[] = [];

  protected render(): TemplateResult {
    const overdue = this.tasks.filter((t) => t.urgency === 'overdue').length;
    const dueSoon = this.tasks.filter((t) => t.urgency === 'due_soon').length;
    const onTrack = this.tasks.filter((t) => t.urgency === 'on_track').length;

    return html`
      <div class="header">
        ${overdue > 0
          ? html`
              <span class="badge overdue" style="--badge-color:${URGENCY_COLORS.overdue}">
                ${overdue} ${localize('card.overdue')}
              </span>
            `
          : ''}
        ${dueSoon > 0
          ? html`
              <span class="badge due-soon" style="--badge-color:${URGENCY_COLORS.due_soon}">
                ${dueSoon} ${localize('card.due_soon')}
              </span>
            `
          : ''}
        ${onTrack > 0
          ? html`
              <span class="badge on-track" style="--badge-color:${URGENCY_COLORS.on_track}">
                ${onTrack} ${localize('card.on_track')}
              </span>
            `
          : ''}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .header {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0 0 12px 0;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        color: var(--badge-color);
        background: color-mix(in srgb, var(--badge-color) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--badge-color) 30%, transparent);
      }
    `;
  }
}
