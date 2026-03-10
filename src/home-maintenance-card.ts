import { LitElement, html, TemplateResult, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';

import type { HomeMaintenanceCardConfig, TaskData } from './types';
import { CARD_VERSION, CARD_NAME, DEFAULTS } from './const';
import { discoverEntities, buildTaskData, sortTasks, filterTasks } from './utils';
import { localize } from './localize/localize';
import { cardStyles } from './styles';

import './components/task-tile';
import './components/summary-header';
import './components/progress-ring';

console.info(
  `%c HOME-MAINTENANCE-CARD \n%c ${localize('common.version')} ${CARD_VERSION} `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

interface WindowWithCustomCards extends Window {
  customCards: Array<{ type: string; name: string; description: string; preview?: boolean }>;
}

(window as unknown as WindowWithCustomCards).customCards =
  (window as unknown as WindowWithCustomCards).customCards || [];
(window as unknown as WindowWithCustomCards).customCards.push({
  type: CARD_NAME,
  name: 'Home Maintenance Card',
  description:
    'Visual task tracker for the Home Maintenance integration with progress rings, auto-discovery, and one-tap completion.',
  preview: true,
});

@customElement(CARD_NAME)
export class HomeMaintenanceCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('home-maintenance-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Record<string, unknown> {
    return { title: DEFAULTS.title };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: HomeMaintenanceCardConfig;
  @state() private _activeFilter: string = DEFAULTS.filter;

  public setConfig(config: HomeMaintenanceCardConfig): void {
    if (!config) throw new Error(localize('common.invalid_configuration'));
    this._config = { ...config };
    this._activeFilter = config.filter ?? DEFAULTS.filter;
  }

  public getCardSize(): number {
    return 3;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has('_config') || changedProps.has('_activeFilter')) return true;
    if (!changedProps.has('hass')) return false;

    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (!oldHass) return true;

    const entityIds = discoverEntities(
      this.hass,
      this._config.entities,
      this._config.exclude_entities
    );
    return entityIds.some((id) => oldHass.states[id] !== this.hass.states[id]);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="task-grid" style="--hm-grid-columns:${this._columns()}">
              ${[1, 2, 3].map(() => html`<div class="skeleton-tile"></div>`)}
            </div>
          </div>
        </ha-card>
      `;
    }

    const entityIds = discoverEntities(
      this.hass,
      this._config.entities,
      this._config.exclude_entities
    );

    const dueSoonDays = this._config.due_soon_days ?? DEFAULTS.due_soon_days;
    let tasks: TaskData[] = entityIds
      .map((id) => this.hass.states[id])
      .filter(Boolean)
      .map((stateObj) => buildTaskData(stateObj, dueSoonDays));

    const sortBy = this._config.sort_by ?? DEFAULTS.sort_by;
    tasks = sortTasks(tasks, sortBy);
    tasks = filterTasks(tasks, this._activeFilter as any);

    const allTasks: TaskData[] = entityIds
      .map((id) => this.hass.states[id])
      .filter(Boolean)
      .map((stateObj) => buildTaskData(stateObj, dueSoonDays));

    const viewMode = this._config.view_mode ?? DEFAULTS.view_mode;
    const progressType = this._config.progress_type ?? DEFAULTS.progress_type;
    const showHeader = this._config.show_header ?? DEFAULTS.show_header;
    const showFilterBar = this._config.show_filter_bar ?? DEFAULTS.show_filter_bar;
    const title = this._config.title;
    const columns = this._columns();

    return html`
      <ha-card>
        ${title
          ? html`
              <div class="card-header">
                <span class="card-title">${title}</span>
              </div>
            `
          : nothing}
        <div class="card-content">
          ${showHeader ? html`<hm-summary-header .tasks=${allTasks}></hm-summary-header>` : nothing}
          ${showFilterBar ? this._renderFilterBar() : nothing}
          ${tasks.length === 0
            ? html`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  ${localize('card.no_tasks')}
                </div>
              `
            : this._renderTasks(tasks, viewMode, progressType, columns)}
        </div>
      </ha-card>
    `;
  }

  private _renderFilterBar(): TemplateResult {
    const filters = ['all', 'overdue', 'due_soon', 'on_track'] as const;
    return html`
      <div class="filter-bar">
        ${filters.map(
          (f) => html`
            <button
              class="filter-chip ${this._activeFilter === f ? 'active' : ''}"
              @click=${() => {
                this._activeFilter = f;
              }}
            >
              ${localize(`editor.${f}`)}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderTasks(
    tasks: TaskData[],
    viewMode: string,
    progressType: string,
    columns: number
  ): TemplateResult {
    const containerClass =
      viewMode === 'list' ? 'task-list' : viewMode === 'compact' ? 'task-compact' : 'task-grid';

    const style = viewMode === 'grid' ? `--hm-grid-columns:${columns}` : '';

    return html`
      <div class="${containerClass}" style="${style}">
        ${tasks.map(
          (task) => html`
            <hm-task-tile
              .hass=${this.hass}
              .task=${task}
              .progressType=${progressType}
              .viewMode=${viewMode}
            ></hm-task-tile>
          `
        )}
      </div>
    `;
  }

  private _columns(): number {
    return this._config?.columns ?? 3;
  }

  static styles = cardStyles;
}
