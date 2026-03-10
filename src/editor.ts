import { LitElement, html, css, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import { HomeMaintenanceCardConfig } from './types';
import { CARD_EDITOR_NAME, DEFAULTS } from './const';
import { localize } from './localize/localize';

@customElement(CARD_EDITOR_NAME)
export class HomeMaintenanceCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: HomeMaintenanceCardConfig;
  @state() private _openSection = 'general';

  public setConfig(config: HomeMaintenanceCardConfig): void {
    this._config = { ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    return html`
      ${this._renderSection('general', localize('editor.general'), this._renderGeneral())}
      ${this._renderSection('entities', localize('editor.entities'), this._renderEntities())}
      ${this._renderSection('display', localize('editor.display'), this._renderDisplay())}
      ${this._renderSection('features', localize('editor.features'), this._renderFeatures())}
    `;
  }

  /* ── Sections ─────────────────────────────────────────── */

  private _renderGeneral(): TemplateResult {
    const c = this._config!;
    return html`
      <ha-textfield
        .label=${localize('editor.title')}
        .value=${c.title ?? ''}
        .configValue=${'title'}
        @input=${this._valueChanged}
      ></ha-textfield>

      <ha-select
        .label=${localize('editor.view_mode')}
        .value=${c.view_mode ?? DEFAULTS.view_mode}
        .configValue=${'view_mode'}
        .options=${[
          { value: 'grid', label: localize('editor.grid') },
          { value: 'list', label: localize('editor.list') },
          { value: 'compact', label: localize('editor.compact') },
        ]}
        @selected=${this._selectChanged}
      ></ha-select>

      <ha-select
        .label=${localize('editor.progress_type')}
        .value=${c.progress_type ?? DEFAULTS.progress_type}
        .configValue=${'progress_type'}
        .options=${[
          { value: 'ring', label: localize('editor.ring') },
          { value: 'bar', label: localize('editor.bar') },
        ]}
        @selected=${this._selectChanged}
      ></ha-select>
    `;
  }

  private _renderEntities(): TemplateResult {
    return html`
      <p style="color:var(--secondary-text-color);font-size:13px;margin:0 0 12px 0;">
        ${localize('editor.auto_discover')}
      </p>
    `;
  }

  private _renderDisplay(): TemplateResult {
    const c = this._config!;
    return html`
      <ha-select
        .label=${localize('editor.sort_by')}
        .value=${c.sort_by ?? DEFAULTS.sort_by}
        .configValue=${'sort_by'}
        .options=${[
          { value: 'urgency', label: localize('editor.urgency') },
          { value: 'name', label: localize('editor.name') },
          { value: 'due_date', label: localize('editor.due_date') },
        ]}
        @selected=${this._selectChanged}
      ></ha-select>

      <ha-select
        .label=${localize('editor.filter')}
        .value=${c.filter ?? DEFAULTS.filter}
        .configValue=${'filter'}
        .options=${[
          { value: 'all', label: localize('editor.all') },
          { value: 'overdue', label: localize('card.overdue') },
          { value: 'due_soon', label: localize('card.due_soon') },
          { value: 'on_track', label: localize('card.on_track') },
        ]}
        @selected=${this._selectChanged}
      ></ha-select>

      <ha-textfield
        .label=${localize('editor.columns')}
        type="number"
        min="1"
        max="6"
        .value=${String(c.columns ?? 3)}
        .configValue=${'columns'}
        @input=${this._numChanged}
      ></ha-textfield>

      <ha-textfield
        .label=${localize('editor.due_soon_days')}
        type="number"
        min="1"
        max="90"
        .value=${String(c.due_soon_days ?? DEFAULTS.due_soon_days)}
        .configValue=${'due_soon_days'}
        @input=${this._numChanged}
      ></ha-textfield>
    `;
  }

  private _renderFeatures(): TemplateResult {
    const c = this._config!;
    return html`
      <ha-formfield .label=${localize('editor.show_header')}>
        <ha-switch
          .checked=${c.show_header ?? DEFAULTS.show_header}
          .configValue=${'show_header'}
          @change=${this._boolChanged}
        ></ha-switch>
      </ha-formfield>

      <ha-formfield .label=${localize('editor.show_filter_bar')}>
        <ha-switch
          .checked=${c.show_filter_bar ?? DEFAULTS.show_filter_bar}
          .configValue=${'show_filter_bar'}
          @change=${this._boolChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  /* ── Accordion ────────────────────────────────────────── */

  private _renderSection(id: string, title: string, content: TemplateResult): TemplateResult {
    const isOpen = this._openSection === id;
    return html`
      <div class="accordion ${isOpen ? 'accordion--open' : ''}">
        <button
          class="accordion__header"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._openSection = this._openSection === id ? '' : id;
          }}
          aria-expanded=${isOpen}
        >
          <span>${title}</span>
          <ha-icon .icon=${isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}></ha-icon>
        </button>
        <div class="accordion__body">
          <div class="accordion__content">${content}</div>
        </div>
      </div>
    `;
  }

  /* ── Change handlers ──────────────────────────────────── */

  private _selectChanged(ev: CustomEvent<{ value?: string }>): void {
    if (!this._config) return;
    const target = ev.target as HTMLElement & { configValue?: string };
    const key = target.configValue;
    if (!key) return;
    const val = ev.detail?.value;
    if (val === undefined) return;
    if ((this._config as Record<string, unknown>)[key] === val) return;
    this._config = { ...this._config, [key]: val === '' ? undefined : val };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _valueChanged(ev: Event): void {
    if (!this._config) return;
    const target = ev.target as HTMLInputElement & { configValue?: string };
    const key = target.configValue;
    if (!key) return;
    const val = target.value;
    if ((this._config as Record<string, unknown>)[key] === val) return;
    this._config = { ...this._config, [key]: val === '' ? undefined : val };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _numChanged(ev: Event): void {
    if (!this._config) return;
    const target = ev.target as HTMLInputElement & { configValue?: string };
    const key = target.configValue;
    if (!key) return;
    const num = parseInt(target.value, 10);
    if (isNaN(num)) return;
    if ((this._config as Record<string, unknown>)[key] === num) return;
    this._config = { ...this._config, [key]: num };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _boolChanged(ev: Event): void {
    if (!this._config) return;
    const target = ev.target as HTMLInputElement & { configValue?: string; checked?: boolean };
    const key = target.configValue;
    if (!key) return;
    if ((this._config as Record<string, unknown>)[key] === target.checked) return;
    this._config = { ...this._config, [key]: target.checked };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select,
      ha-textfield {
        margin-bottom: 16px;
        display: block;
      }
      ha-formfield {
        display: block;
        padding: 8px 0;
      }
      .accordion {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 8px;
        /* overflow: visible so ha-select dropdowns are not clipped */
      }
      .accordion__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 12px 16px;
        background: var(--secondary-background-color);
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        text-align: left;
        transition: background 0.15s ease;
      }
      .accordion__header:hover {
        background: var(--divider-color);
      }
      .accordion--open .accordion__header {
        border-bottom: 1px solid var(--divider-color);
      }
      .accordion__body {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.25s ease;
      }
      .accordion--open .accordion__body {
        grid-template-rows: 1fr;
      }
      .accordion__content {
        overflow: visible;
        padding: 0 16px;
      }
      .accordion--open .accordion__content {
        padding: 16px;
      }
    `;
  }
}
