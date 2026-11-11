import { LitElement, html, TemplateResult, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';

import type { HomeMaintenanceCardConfig, TaskData } from './types';
import { CARD_VERSION, CARD_NAME, DEFAULTS } from './const';
import { discoverEntities, buildTaskData, sortTasks, filterTasks } from './utils';
import { localize } from './localize/localize';
import { cardStyles } from './styles';

import './components/task-tile';
import './components/progress-ring';

console.info(
  `%c UPKEEP \n%c ${localize('common.version')} ${CARD_VERSION} `,
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
  name: 'Upkeep Card',
  description:
    'Visual task tracker for the Upkeep integration with progress rings, auto-discovery, and one-tap completion.',
  preview: true,
});

@customElement(CARD_NAME)
export class HomeMaintenanceCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('upkeep-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Record<string, unknown> {
    return { title: DEFAULTS.title };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: HomeMaintenanceCardConfig;
  @state() private _activeFilter: NonNullable<HomeMaintenanceCardConfig['filter']> =
    DEFAULTS.filter;

  public setConfig(config: HomeMaintenanceCardConfig): void {
    if (!config) return;
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
    if (!this._config) return true;

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
    tasks = filterTasks(tasks, this._activeFilter);

    const allTasks: TaskData[] = entityIds
      .map((id) => this.hass.states[id])
      .filter(Boolean)
      .map((stateObj) => buildTaskData(stateObj, dueSoonDays));

    const viewMode = this._config.view_mode ?? DEFAULTS.view_mode;
    const progressType = this._config.progress_type ?? DEFAULTS.progress_type;
    const showHeader = this._config.show_header ?? DEFAULTS.show_header;
    const showFilterBar =
      (this._config.show_filter_bar ?? DEFAULTS.show_filter_bar) || viewMode === 'list';
    const title = this._config.title;
    const columns = this._columns();
    const lang = this._locale();

    return html`
      <ha-card>
        ${title || showHeader
          ? html`
              <header class="card-header">
                ${title ? html`<h2 class="card-title">${title}</h2>` : nothing}
                ${showHeader
                  ? html`<p class="card-subtitle">${this._summary(allTasks)}</p>`
                  : nothing}
              </header>
            `
          : nothing}
        ${showFilterBar ? this._renderFilterBar(allTasks) : nothing}
        <div class="card-content ${viewMode}">
          ${tasks.length === 0
            ? html`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  ${localize('card.no_tasks', undefined, lang)}
                </div>
              `
            : this._renderTasks(tasks, viewMode, progressType, columns)}
        </div>
      </ha-card>
    `;
  }

  private _locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _t(key: string, vars?: Record<string, string | number>): string {
    return localize(key, vars, this._locale());
  }

  private _isOne(count: number): boolean {
    const tag = this._locale().replace(/['"]+/g, '').replaceAll('_', '-');
    try {
      return new Intl.PluralRules(tag).select(count) === 'one';
    } catch {
      return count === 1;
    }
  }

  private _countPhrase(count: number, oneKey: string, otherKey: string): string {
    return this._t(this._isOne(count) ? oneKey : otherKey, { count });
  }

  private _summary(tasks: TaskData[]): string {
    const active = tasks.filter((task) => task.urgency !== 'snoozed');
    const taskCount = this._countPhrase(
      active.length,
      'panel.task_count_one',
      'panel.task_count_other'
    );
    const snoozed = tasks.length - active.length;
    const overdue = active.filter((task) => task.urgency === 'overdue').length;
    const dueSoon = active.filter((task) => task.urgency === 'due_soon').length;
    const unknown = active.filter((task) => task.urgency === 'unknown').length;
    if (active.length > 0 && overdue === 0 && dueSoon === 0 && snoozed === 0 && unknown === 0) {
      return this._t('panel.summary_clear', { tasks: taskCount });
    }
    const parts = [
      overdue > 0
        ? this._countPhrase(overdue, 'panel.count_overdue_one', 'panel.count_overdue_other')
        : '',
      dueSoon > 0
        ? this._countPhrase(dueSoon, 'panel.count_due_soon_one', 'panel.count_due_soon_other')
        : '',
      snoozed > 0
        ? this._countPhrase(snoozed, 'panel.count_snoozed_one', 'panel.count_snoozed_other')
        : '',
    ].filter(Boolean);
    if (parts.length === 0) return taskCount;
    return this._t('panel.summary_attention', { tasks: taskCount, detail: parts.join(', ') });
  }

  private _filterCount(
    tasks: TaskData[],
    filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' | 'unknown'
  ): number {
    if (filter === 'snoozed') return tasks.filter((task) => task.urgency === 'snoozed').length;
    const active = tasks.filter((task) => task.urgency !== 'snoozed');
    if (filter === 'all') return active.length;
    return active.filter((task) => task.urgency === filter).length;
  }

  private _filterLabel(
    filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' | 'unknown',
    count: number
  ): string {
    const plural = (one: string, other: string) => this._t(this._isOne(count) ? one : other);
    switch (filter) {
      case 'all':
        return this._t('panel.filter_all');
      case 'overdue':
        return plural('panel.filter_overdue_one', 'panel.filter_overdue_other');
      case 'due_soon':
        return plural('panel.filter_due_soon_one', 'panel.filter_due_soon_other');
      case 'on_track':
        return this._t('panel.filter_on_track');
      case 'snoozed':
        return plural('panel.filter_snoozed_one', 'panel.filter_snoozed_other');
      case 'unknown':
        return this._t('editor.filter_unknown');
    }
  }

  private _renderFilterBar(tasks: TaskData[]): TemplateResult {
    const filters = ['all', 'overdue', 'due_soon', 'on_track', 'snoozed'] as const;
    return html`
      <div class="filter-bar" role="group" aria-label=${this._t('editor.filter')}>
        ${filters.map((filter) => {
          const count = this._filterCount(tasks, filter);
          const selected = this._activeFilter === filter;
          return html`
            <button
              type="button"
              class="filter-chip ${selected ? 'active' : ''}"
              aria-pressed=${selected ? 'true' : 'false'}
              @click=${() => {
                this._activeFilter = filter;
              }}
            >
              ${this._filterLabel(filter, count)}
              <span class="filter-count">${count}</span>
            </button>
          `;
        })}
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
