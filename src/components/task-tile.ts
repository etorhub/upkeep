import { LitElement, html, css, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { TaskData } from '../types';
import { getUrgencyColor, formatDaysRemaining } from '../utils';
import { localize } from '../localize/localize';
import './progress-ring';

@customElement('hm-task-tile')
export class TaskTile extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) task!: TaskData;
  @property({ type: String }) progressType: 'ring' | 'bar' = 'ring';
  @property({ type: String }) viewMode: 'grid' | 'list' | 'compact' = 'grid';

  @state() private _confirming = false;
  @state() private _done = false;

  private _handleDone(): void {
    if (!this._confirming) {
      this._confirming = true;
      return;
    }
    this.hass.callService('home_maintenance', 'reset_last_performed', {
      entity_id: this.task.entity_id,
    });
    this._confirming = false;
    this._done = true;
    setTimeout(() => {
      this._done = false;
    }, 1500);
  }

  private _cancelConfirm(): void {
    this._confirming = false;
  }

  private _showMoreInfo(): void {
    const event = new Event('hass-more-info', { bubbles: true, composed: true });
    (event as any).detail = { entityId: this.task.entity_id };
    this.dispatchEvent(event);
  }

  protected render(): TemplateResult {
    const { task } = this;
    const color = getUrgencyColor(task.urgency);
    const locale = this.hass?.locale?.language ?? this.hass?.language ?? 'en';
    const daysText = formatDaysRemaining(task.days_remaining, locale);
    const isOverdue = task.urgency === 'overdue';

    if (this.viewMode === 'list') return this._renderList(color, daysText, isOverdue);
    if (this.viewMode === 'compact') return this._renderCompact(color, daysText, isOverdue);
    return this._renderGrid(color, daysText, isOverdue);
  }

  private _renderGrid(color: string, daysText: string, isOverdue: boolean): TemplateResult {
    const { task } = this;
    return html`
      <div class="tile grid ${isOverdue ? 'overdue' : ''} ${this._done ? 'done-anim' : ''}">
        <div class="tile-top" @click=${this._showMoreInfo}>
          <div class="icon-wrap" style="color: ${color}">
            <ha-icon .icon=${task.icon}></ha-icon>
          </div>
          ${this._renderProgress(color)}
        </div>
        <div class="tile-body" @click=${this._showMoreInfo}>
          <div class="name">${task.name}</div>
          <div class="due" style="color: ${color}">${daysText}</div>
        </div>
        <div class="tile-actions">${this._renderDoneButton()}</div>
      </div>
    `;
  }

  private _renderList(color: string, daysText: string, isOverdue: boolean): TemplateResult {
    const { task } = this;
    const isBarProgress = this.progressType === 'bar';
    return html`
      <div
        class="tile list ${isBarProgress ? 'list-bar' : ''} ${isOverdue ? 'overdue' : ''} ${this
          ._done
          ? 'done-anim'
          : ''}"
      >
        <div class="list-row">
          <div class="icon-wrap list-icon" style="color: ${color}" @click=${this._showMoreInfo}>
            <ha-icon .icon=${task.icon}></ha-icon>
          </div>
          <div class="list-info" @click=${this._showMoreInfo}>
            <div class="name">${task.name}</div>
            <div class="due" style="color: ${color}">${daysText}</div>
          </div>
          ${!isBarProgress
            ? html`<div class="list-progress">${this._renderProgress(color)}</div>`
            : nothing}
          <div class="list-action">${this._renderDoneButton()}</div>
        </div>
        ${isBarProgress
          ? html`<div class="list-bar-footer">${this._renderProgress(color)}</div>`
          : nothing}
      </div>
    `;
  }

  private _renderCompact(color: string, _daysText: string, isOverdue: boolean): TemplateResult {
    const { task } = this;
    return html`
      <div
        class="tile compact ${isOverdue ? 'overdue' : ''} ${this._done ? 'done-anim' : ''}"
        @click=${this._showMoreInfo}
      >
        <div class="icon-wrap compact-icon" style="color: ${color}">
          <ha-icon .icon=${task.icon}></ha-icon>
        </div>
        <div class="compact-name">${task.name}</div>
        ${this._renderProgress(color, 32, 3)}
      </div>
    `;
  }

  private _renderProgress(color: string, size = 48, stroke = 4): TemplateResult {
    if (this.progressType === 'bar') {
      const pct = Math.min(this.task.progress, 100);
      return html`
        <div class="bar-wrap">
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color};"></div>
          </div>
        </div>
      `;
    }
    return html`
      <hm-progress-ring
        .progress=${this.task.progress}
        .color=${color}
        .size=${size}
        .strokeWidth=${stroke}
      ></hm-progress-ring>
    `;
  }

  private _renderDoneButton(): TemplateResult {
    if (this._done) {
      return html`
        <div class="done-check">
          <ha-icon icon="mdi:check-circle" style="color:var(--success-color, #4caf50)"></ha-icon>
        </div>
      `;
    }

    if (this._confirming) {
      return html`
        <div class="confirm-row">
          <button class="btn btn-confirm" @click=${this._handleDone}>
            <ha-icon icon="mdi:check"></ha-icon>
          </button>
          <button class="btn btn-cancel" @click=${this._cancelConfirm}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
      `;
    }

    return html`
      <button class="btn btn-done" @click=${this._handleDone}>${localize('card.mark_done')}</button>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      /* Grid tile */
      .tile.grid {
        background: var(--card-background-color, var(--ha-card-background, #fff));
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
        transition:
          box-shadow 0.2s ease,
          transform 0.2s ease,
          border-color 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .tile.grid:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }
      .tile-top {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        width: 100%;
      }
      .tile-body {
        text-align: center;
        cursor: pointer;
        width: 100%;
      }
      .tile-actions {
        margin-top: 4px;
      }

      /* List tile */
      .tile.list {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        transition: background 0.15s ease;
      }
      .tile.list:hover {
        background: var(--secondary-background-color);
      }
      .tile.list .list-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
      }
      .tile.list.list-bar .list-row {
        padding-bottom: 8px;
      }
      .tile.list .list-bar-footer {
        padding: 0 16px 12px 16px;
        width: 100%;
        box-sizing: border-box;
      }
      .tile.list .list-bar-footer .bar-wrap {
        padding: 0;
      }
      .tile.list .list-bar-footer .bar-track {
        height: 8px;
      }
      .list-info {
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }
      .list-progress {
        flex-shrink: 0;
      }
      .list-action {
        flex-shrink: 0;
      }

      /* Compact tile */
      .tile.compact {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.15s ease;
      }
      .tile.compact:hover {
        background: var(--secondary-background-color);
      }
      .compact-name {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Icon */
      .icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-wrap ha-icon {
        --mdc-icon-size: 28px;
      }
      .compact-icon ha-icon {
        --mdc-icon-size: 20px;
      }
      .list-icon {
        cursor: pointer;
      }

      /* Text */
      .name {
        font-weight: 500;
        font-size: 14px;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .due {
        font-size: 12px;
        margin-top: 2px;
        font-weight: 500;
      }

      /* Progress bar variant */
      .bar-wrap {
        width: 100%;
        padding: 0 4px;
      }
      .bar-track {
        background: var(--divider-color, #e0e0e0);
        border-radius: 4px;
        height: 6px;
        width: 100%;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition:
          width 0.6s ease,
          background 0.3s ease;
      }

      /* Buttons */
      .btn {
        border: none;
        border-radius: 8px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .btn-done {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .btn-done:hover {
        filter: brightness(1.1);
        transform: scale(1.03);
      }
      .btn-confirm {
        background: var(--success-color, #4caf50);
        color: #fff;
      }
      .btn-cancel {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
      }
      .btn-confirm ha-icon,
      .btn-cancel ha-icon {
        --mdc-icon-size: 16px;
      }
      .confirm-row {
        display: flex;
        gap: 6px;
      }
      .done-check {
        animation: popIn 0.3s ease;
      }
      .done-check ha-icon {
        --mdc-icon-size: 28px;
      }

      /* Overdue pulse */
      .tile.overdue {
        border-color: var(--error-color, #f44336);
      }
      .tile.overdue.grid {
        animation: overduePulse 2s ease-in-out infinite;
      }

      /* Done animation */
      .done-anim {
        animation: donePop 0.4s ease;
      }

      @keyframes overduePulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
        }
        50% {
          box-shadow: 0 0 12px 2px rgba(244, 67, 54, 0.2);
        }
      }
      @keyframes popIn {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        70% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes donePop {
        0% {
          transform: scale(1);
        }
        30% {
          transform: scale(0.97);
        }
        60% {
          transform: scale(1.02);
        }
        100% {
          transform: scale(1);
        }
      }
    `;
  }
}
