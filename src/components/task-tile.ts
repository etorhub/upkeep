import { LitElement, html, css, svg, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { safeCustomElement } from '../define';
import { property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { TaskData } from '../types';
import { getUrgencyColor, formatDaysRemaining } from '../utils';
import { formatPart } from '../status-format';
import { localize } from '../localize/localize';
import './progress-ring';

@safeCustomElement('upkeep-task-tile')
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
    this.hass.callService('upkeep', 'reset_last_performed', {
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
    const event = new CustomEvent<{ entityId: string }>('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.task.entity_id },
    });
    this.dispatchEvent(event);
  }

  protected render(): TemplateResult {
    const { task } = this;
    const color = getUrgencyColor(task.urgency);
    const locale = this.hass?.locale?.language ?? this.hass?.language ?? 'en';
    const daysText = task.status_key
      ? formatPart({ key: task.status_key, vars: task.status_vars }, locale, this.hass)
      : formatDaysRemaining(task.days_remaining, locale, task.task_type);
    const isOverdue = task.urgency === 'overdue';

    if (this.viewMode === 'list') return this._renderList(color, daysText, isOverdue);
    if (this.viewMode === 'compact') return this._renderCompact(color, daysText, isOverdue);
    return this._renderGrid(color, daysText, isOverdue);
  }

  private _localeTag(): string {
    return (this.hass?.locale?.language ?? this.hass?.language ?? 'en').replaceAll('_', '-');
  }

  private _dueLabel(withWeekday: boolean): string | null {
    const { task } = this;
    if (task.task_type === 'frequency' || !task.next_due || task.next_due.getTime() === 0) {
      return null;
    }
    const date = new Intl.DateTimeFormat(this._localeTag(), {
      ...(withWeekday ? { weekday: 'short' as const } : {}),
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(task.next_due);
    const locale = this.hass?.locale?.language ?? this.hass?.language;
    return withWeekday ? localize('panel.due_on', { date }, locale) : date;
  }

  private _shownProgress(): number {
    return Math.max(2, Math.min(100, this.task.progress));
  }

  private _phrase(key?: string, vars?: Record<string, string | number>): string {
    if (!key) return '';
    const locale = this.hass?.locale?.language ?? this.hass?.language;
    return formatPart({ key, vars }, locale, this.hass);
  }

  private _ruleLine(): TemplateResult | typeof nothing {
    const text = this._phrase(this.task.rule_key, this.task.rule_vars);
    return text ? html`<span class="due">${text}</span>` : nothing;
  }

  private _tagLine(): TemplateResult | typeof nothing {
    const text = this._phrase(this.task.tag_key ?? undefined, undefined);
    return text ? html`<span class="due">${text}</span>` : nothing;
  }

  private _meterLines(color: string): TemplateResult | typeof nothing {
    const meters = this.task.meters ?? [];
    if (meters.length < 2) return nothing;
    const locale = this.hass?.locale?.language ?? this.hass?.language;
    return html`
      ${meters.map(
        (meter) => html`
          <span class="due">
            ${meter.leading ? localize('card.due_first', undefined, locale) : ''}
            ${formatPart(
              { key: meter.status_key || '', vars: meter.status_vars },
              locale,
              this.hass
            )}
          </span>
          <span class="meter" aria-hidden="true">
            <span
              class="meter-fill"
              style="inline-size:${Math.max(
                2,
                Math.min(100, meter.progress ?? 0)
              )}%;background:${color}"
            ></span>
          </span>
        `
      )}
    `;
  }

  private _renderRing(color: string): TemplateResult {
    const size = 56;
    const stroke = 3;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dash = (this._shownProgress() / 100) * circumference;
    const center = size / 2;
    return svg`
      <svg
        class="ring-svg"
        width="${size}"
        height="${size}"
        viewBox="0 0 ${size} ${size}"
        aria-hidden="true"
      >
        <circle
          cx="${center}"
          cy="${center}"
          r="${radius}"
          fill="none"
          stroke="var(--divider-color, #363636)"
          stroke-width="${stroke}"
        ></circle>
        <circle
          cx="${center}"
          cy="${center}"
          r="${radius}"
          fill="none"
          stroke="${color}"
          stroke-width="${stroke}"
          stroke-linecap="round"
          stroke-dasharray="${dash} ${circumference - dash}"
          transform="rotate(-90 ${center} ${center})"
        ></circle>
      </svg>
    `;
  }

  private _renderMeter(color: string): TemplateResult {
    return html`
      <span class="meter" aria-hidden="true">
        <span
          class="meter-fill"
          style="inline-size:${this._shownProgress()}%;background:${color}"
        ></span>
      </span>
    `;
  }

  private _renderGrid(color: string, daysText: string, isOverdue: boolean): TemplateResult {
    const { task } = this;
    const dueLong = this._dueLabel(true);
    const dueShort = this._dueLabel(false);
    const useRing = this.progressType !== 'bar';
    return html`
      <article class="tile grid ${isOverdue ? 'overdue' : ''} ${this._done ? 'done-anim' : ''}">
        <button type="button" class="tile-open" @click=${this._showMoreInfo}>
          ${useRing
            ? html`
                <span class="ring">
                  ${this._renderRing(color)}
                  <span
                    class="icon-bubble"
                    style="color:${color};background:color-mix(in srgb, ${color} 14%, transparent)"
                  >
                    <ha-icon .icon=${task.icon} aria-hidden="true"></ha-icon>
                  </span>
                </span>
              `
            : html`
                <span
                  class="icon-tile"
                  style="color:${color};background:color-mix(in srgb, ${color} 14%, transparent)"
                >
                  <ha-icon .icon=${task.icon} aria-hidden="true"></ha-icon>
                </span>
              `}
          <span class="copy">
            <span class="name">${task.name}</span>
            ${this._ruleLine()}
            <span class="remaining" style="color:${color}">${daysText}</span>
            ${this._tagLine()} ${this._meterLines(color)}
            ${dueLong ? html`<span class="due due-long">${dueLong}</span>` : nothing}
            ${dueShort ? html`<span class="due due-short">${dueShort}</span>` : nothing}
            ${useRing ? nothing : this._renderMeter(color)}
          </span>
        </button>
        <footer class="tile-actions">${this._renderDoneButton()}</footer>
      </article>
    `;
  }

  private _renderList(color: string, daysText: string, isOverdue: boolean): TemplateResult {
    const { task } = this;
    const dueLong = this._dueLabel(true);
    const dueShort = this._dueLabel(false);
    return html`
      <article class="tile list ${isOverdue ? 'overdue' : ''} ${this._done ? 'done-anim' : ''}">
        <button type="button" class="tile-open" @click=${this._showMoreInfo}>
          <span
            class="icon-tile"
            style="color:${color};background:color-mix(in srgb, ${color} 14%, transparent)"
          >
            <ha-icon .icon=${task.icon} aria-hidden="true"></ha-icon>
          </span>
          <span class="copy">
            <span class="name">${task.name}</span>
            ${this._ruleLine()}
            <span class="meta">
              <span class="remaining" style="color:${color}">${daysText}</span>
              ${dueLong ? html`<span class="due due-long"> · ${dueLong}</span>` : nothing}
              ${dueShort ? html`<span class="due due-short"> · ${dueShort}</span>` : nothing}
            </span>
            ${this._renderMeter(color)}
          </span>
        </button>
        <footer class="tile-actions">${this._renderDoneButton()}</footer>
      </article>
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
      <upkeep-progress-ring
        .progress=${this.task.progress}
        .color=${color}
        .size=${size}
        .strokeWidth=${stroke}
      ></upkeep-progress-ring>
    `;
  }

  private _renderDoneButton(): TemplateResult {
    const locale = this.hass?.locale?.language ?? this.hass?.language;
    const label = localize('card.mark_done', undefined, locale);
    const named = `${label}: ${this.task.name}`;
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
          <button
            type="button"
            class="btn btn-confirm"
            aria-label=${named}
            @click=${this._handleDone}
          >
            <ha-icon icon="mdi:check"></ha-icon>
          </button>
          <button
            type="button"
            class="btn btn-cancel"
            aria-label=${localize('panel.cancel', undefined, locale)}
            @click=${this._cancelConfirm}
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
      `;
    }

    const urgent = this.task.urgency === 'overdue' || this.task.urgency === 'due_soon';
    const disabled = this.task.done_enabled === false;
    return html`
      <button
        type="button"
        class="btn btn-done ${urgent ? 'urgent' : ''}"
        ?disabled=${disabled}
        aria-label=${named}
        @click=${this._handleDone}
      >
        <span class="check-face" aria-hidden="true">
          <ha-icon icon="mdi:check"></ha-icon>
        </span>
        <span class="btn-label">${label}</span>
      </button>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        container: tile / inline-size;
      }

      .tile.grid,
      .tile.list {
        color: var(--primary-text-color);
      }
      .tile-open {
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      .tile-open:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 3px;
      }
      .copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-inline-size: 0;
      }
      .tile.grid .name,
      .tile.list .name {
        font-size: 16px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
      }
      .remaining {
        font-size: 14px;
        font-weight: 500;
      }
      .due {
        font-size: 13px;
        font-weight: 400;
        color: var(--secondary-text-color);
        text-wrap: pretty;
      }
      .due-short {
        display: none;
      }
      .icon-tile,
      .icon-bubble {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .icon-tile {
        inline-size: 44px;
        block-size: 44px;
        border-radius: 12px;
      }
      .icon-tile ha-icon {
        --mdc-icon-size: 24px;
      }
      .ring {
        position: relative;
        inline-size: 56px;
        block-size: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .ring-svg {
        position: absolute;
        inset: 0;
      }
      .icon-bubble {
        inline-size: 42px;
        block-size: 42px;
        border-radius: 21px;
      }
      .icon-bubble ha-icon {
        --mdc-icon-size: 22px;
      }
      .meter {
        display: block;
        block-size: 4px;
        border-radius: 2px;
        background: var(--divider-color, #363636);
        overflow: clip;
      }
      .meter-fill {
        display: block;
        block-size: 100%;
        border-radius: 2px;
      }

      .tile.grid {
        box-sizing: border-box;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        border: 1px solid var(--divider-color, #343434);
        border-radius: 16px;
        background: var(--card-background-color, var(--ha-card-background, #232323));
      }
      .tile.grid .tile-open {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
      }
      .tile.grid .name {
        text-wrap: balance;
      }
      .tile.grid .tile-actions {
        margin-block-start: auto;
      }

      .tile.list {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 14px;
        padding: 12px 16px 12px 20px;
        border-block-start: 1px solid var(--divider-color, #2e2e2e);
      }
      .tile.list .tile-open {
        flex: 1;
        min-inline-size: 0;
        min-block-size: 56px;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 14px;
      }
      .tile.list .copy {
        flex: 1;
        gap: 5px;
      }
      .tile.list .name,
      .tile.list .meta {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .tile.list .tile-actions {
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

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-block-size: 44px;
        padding: 0 16px;
        border: 1px solid var(--divider-color, #444);
        border-radius: 12px;
        background: transparent;
        color: var(--primary-text-color);
        font: inherit;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
      }
      .btn:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .tile.grid .btn-done,
      .tile.grid .confirm-row {
        inline-size: 100%;
      }
      .check-face {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .check-face ha-icon,
      .btn-confirm ha-icon,
      .btn-cancel ha-icon {
        --mdc-icon-size: 18px;
      }
      .btn-confirm {
        background: var(--success-color, #4caf50);
        border-color: transparent;
        color: #102027;
      }
      .btn-cancel {
        background: transparent;
      }
      .confirm-row {
        display: flex;
        gap: 8px;
      }
      .tile.grid .confirm-row .btn {
        flex: 1;
      }
      .done-check {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-inline-size: 44px;
        min-block-size: 44px;
        animation: popIn 0.3s ease;
      }
      .done-check ha-icon {
        --mdc-icon-size: 28px;
      }

      @container tile (inline-size < 230px) {
        .ring,
        .ring-svg {
          inline-size: 48px;
          block-size: 48px;
        }
        .icon-bubble {
          inline-size: 36px;
          block-size: 36px;
        }
        .icon-bubble ha-icon {
          --mdc-icon-size: 20px;
        }
        .tile.grid {
          gap: 14px;
          padding: 14px;
        }
        .tile.grid .due-long {
          display: none;
        }
        .tile.grid .due-short {
          display: block;
        }
      }
      @container tile (inline-size < 440px) {
        .tile.list {
          gap: 4px;
          padding: 10px 8px 10px 16px;
        }
        .tile.list .due-long {
          display: none;
        }
        .tile.list .due-short {
          display: inline;
        }
        .tile.list .btn-done {
          inline-size: 44px;
          padding: 0;
          border: 0;
          background: transparent;
        }
        .tile.list .btn-done .btn-label {
          display: none;
        }
        .tile.list .btn-done .check-face {
          box-sizing: border-box;
          inline-size: 34px;
          block-size: 34px;
          border: 1.5px solid var(--divider-color, #555);
          border-radius: 17px;
        }
        .tile.list .btn-done.urgent .check-face {
          background: var(--primary-color);
          border-color: transparent;
          color: #102027;
        }
      }

      /* Done animation */
      .done-anim {
        animation: donePop 0.4s ease;
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
