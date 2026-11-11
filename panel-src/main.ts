import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import { localize } from '../src/localize/localize';
import { formatDaysRemaining, getUrgencyColor } from '../src/utils';
import {
  advanceNoticeSkipped,
  computePanelTaskStatus,
  scheduledDueDate,
  subtractInterval,
} from './task-status';
import type { Task } from './types';

export type { Task } from './types';

const DUE_SOON_DAYS = 7;
const COMPLETE_FLASH_MS = 1500;
const DEFAULT_ICON = 'mdi:calendar-check';
const FILTERS = ['all', 'overdue', 'due_soon', 'on_track', 'snoozed'] as const;

type FormMode = 'none' | 'add' | 'edit';

@customElement('upkeep-panel')
export class UpkeepPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow = false;

  @state() private _tasks: Task[] = [];
  @state() private _error: string | null = null;
  @state() private _formMode: FormMode = 'none';
  @state() private _editingTaskId: string | null = null;
  @state() private _filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' = 'all';
  @state() private _draftTitle = '';
  @state() private _draftDescription = '';
  @state() private _draftIcon = DEFAULT_ICON;
  @state() private _draftInterval = '90';
  @state() private _draftPeriod = 'days';
  @state() private _draftTaskType: 'time' | 'frequency' = 'time';
  @state() private _draftFrequencyTarget = '10';
  @state() private _draftNotifyBefore = false;
  @state() private _draftNotifyBeforeValue = '7';
  @state() private _draftNotifyBeforeUnit = 'days';
  @state() private _draftNotifyWhenDue = false;
  @state() private _draftNotifyService = '';
  @state() private _notifyTime = '08:00';
  @state() private _openMenuId: string | null = null;
  @state() private _iconPickerOpen = false;
  @state() private _completingIds: string[] = [];
  @state() private _justCompletedIds: string[] = [];
  @state() private _rowErrors: Record<string, string> = {};
  @state() private _viewportNarrow = false;
  private _loadRequestId = 0;
  private _media: MediaQueryList | null = null;
  private _onViewport = (event: MediaQueryListEvent): void => {
    this._viewportNarrow = event.matches;
  };

  updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass') && this.hass?.connection && this._formMode === 'none') {
      this._loadTasks();
    }
    this._syncSheet();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._watchViewport();
    if (this.hass?.connection) {
      this._loadTasks();
      this._loadNotifyTime();
    }
  }

  disconnectedCallback(): void {
    this._media?.removeEventListener('change', this._onViewport);
    super.disconnectedCallback();
  }

  private _watchViewport(): void {
    if (typeof window.matchMedia !== 'function') return;
    this._media = window.matchMedia('(max-width: 720px)');
    this._viewportNarrow = this._media.matches;
    this._media.addEventListener('change', this._onViewport);
  }

  private _isNarrow(): boolean {
    return Boolean(this.narrow) || this._viewportNarrow;
  }

  private _syncSheet(): void {
    const dialog = this.renderRoot?.querySelector('dialog.sheet');
    if (!(dialog instanceof HTMLDialogElement)) return;
    const shouldOpen = this._isNarrow() && this._openMenuId !== null;
    try {
      if (shouldOpen && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
      else if (!shouldOpen && dialog.open && typeof dialog.close === 'function') dialog.close();
    } catch {
      // The test DOM has no top layer. Home Assistant's browser does.
    }
  }

  private _onSheetClose = (): void => {
    if (this._openMenuId !== null) this._openMenuId = null;
  };

  private _loadTasks(_options?: { silent?: boolean }): void {
    if (!this.hass?.connection) return;
    const requestId = ++this._loadRequestId;
    this.hass.connection
      .sendMessagePromise({ type: 'upkeep/get_tasks' })
      .then((tasks: unknown) => {
        if (requestId !== this._loadRequestId) return;
        this._tasks = Array.isArray(tasks) ? (tasks as Task[]) : [];
        this._error = null;
      })
      .catch((err: Error) => {
        if (requestId !== this._loadRequestId) return;
        this._error = err?.message ?? this._t('panel.load_failed');
      });
  }

  private async _sendCommand<T>(msg: { type: string; [key: string]: unknown }): Promise<T> {
    return this.hass.connection.sendMessagePromise(msg) as Promise<T>;
  }

  private _refresh(): void {
    this._loadTasks({ silent: true });
  }

  private _loadNotifyTime(): void {
    if (!this.hass?.connection) return;
    this.hass.connection
      .sendMessagePromise({ type: 'upkeep/get_config' })
      .then((result: unknown) => {
        if (!result || typeof result !== 'object' || Array.isArray(result)) return;
        const entry = result as {
          options?: { notify_time?: string };
          data?: { notify_time?: string };
        };
        const raw = entry.options?.notify_time || entry.data?.notify_time || '08:00';
        this._notifyTime = String(raw).slice(0, 5);
      })
      .catch(() => undefined);
  }

  private _getTaskEntityId(task: Task): string | null {
    return task.entity_id ?? null;
  }

  private _getTaskStatus(task: Task) {
    return computePanelTaskStatus(task, DUE_SOON_DAYS);
  }

  private _filteredTasks(): Task[] {
    return this._tasks.filter((task) => {
      if (this._filter === 'snoozed') return !task.enabled;
      if (this._filter === 'all') return task.enabled;
      const { urgency } = this._getTaskStatus(task);
      return urgency === this._filter;
    });
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

  private _filterLabel(filter: (typeof FILTERS)[number], count: number): string {
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
    }
  }

  private _filterCount(filter: (typeof FILTERS)[number]): number {
    if (filter === 'snoozed') return this._tasks.filter((task) => !task.enabled).length;
    const enabled = this._tasks.filter((task) => task.enabled);
    if (filter === 'all') return enabled.length;
    return enabled.filter((task) => this._getTaskStatus(task).urgency === filter).length;
  }

  private _summary(): string {
    const enabled = this._tasks.filter((task) => task.enabled);
    const tasks = this._countPhrase(
      enabled.length,
      'panel.task_count_one',
      'panel.task_count_other'
    );
    const snoozed = this._tasks.length - enabled.length;
    const overdue = this._filterCount('overdue');
    const dueSoon = this._filterCount('due_soon');
    if (enabled.length > 0 && overdue === 0 && dueSoon === 0 && snoozed === 0) {
      return this._t('panel.summary_clear', { tasks });
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
    if (parts.length === 0) return tasks;
    return this._t('panel.summary_attention', { tasks, detail: parts.join(', ') });
  }

  private _countPhrase(count: number, oneKey: string, otherKey: string): string {
    return this._t(this._isOne(count) ? oneKey : otherKey, { count });
  }

  private _unitWord(unit: string, count: number): string {
    const kind = unit === 'weeks' ? 'weeks' : unit === 'months' ? 'months' : 'days';
    return this._t(this._isOne(count) ? `panel.unit_${kind}_one` : `panel.unit_${kind}_other`);
  }

  private _formatDate(date: Date): string {
    const tag = this._locale().replaceAll('_', '-');
    return new Intl.DateTimeFormat(tag, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private _formatClock(value: string): string {
    const [hour, minute] = value.split(':').map((part) => parseInt(part, 10));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
    const tag = this._locale().replaceAll('_', '-');
    return new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(2020, 0, 1, hour, minute)
    );
  }

  private _previewAnchor(): Date {
    if (this._formMode === 'edit') {
      const task = this._tasks.find((item) => item.id === this._editingTaskId);
      if (task?.last_performed) {
        const parsed = new Date(task.last_performed);
        if (!Number.isNaN(parsed.getTime())) {
          return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  private _schedulePreview(): string {
    const value = parseInt(this._draftInterval, 10) || 90;
    const due = scheduledDueDate(this._previewAnchor(), value, this._draftPeriod);
    const every = this._t('panel.every_phrase', {
      value,
      unit: this._unitWord(this._draftPeriod, value),
    });
    const dueLabel = this._t('panel.due_on', { date: this._formatDate(due) });
    const remaining = formatDaysRemaining(
      Math.round((due.getTime() - this._previewAnchor().getTime()) / 86400000),
      this._locale()
    );
    return `${every}. ${dueLabel} · ${remaining}`;
  }

  private _noticeForecast(): string {
    const time = this._formatClock(this._notifyTime);
    const lines: string[] = [];
    const anchor = this._previewAnchor();
    const interval = parseInt(this._draftInterval, 10) || 90;
    const due = scheduledDueDate(anchor, interval, this._draftPeriod);
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (this._draftTaskType !== 'frequency' && this._draftNotifyBefore) {
      const lead = this._notifyAheadValue();
      if (
        advanceNoticeSkipped(anchor, interval, this._draftPeriod, lead, this._draftNotifyBeforeUnit)
      ) {
        lines.push(this._t('panel.notify_before_skipped'));
      } else {
        const start = subtractInterval(due, lead, this._draftNotifyBeforeUnit);
        lines.push(
          start.getTime() > todayMid.getTime()
            ? this._t('panel.notify_before_on', { date: this._formatDate(start), time })
            : this._t('panel.notify_before_next', { time })
        );
      }
    }
    if (this._draftNotifyWhenDue) {
      if (this._draftTaskType === 'frequency') {
        lines.push(this._t('panel.notify_due_frequency'));
      } else {
        lines.push(
          due.getTime() > todayMid.getTime()
            ? this._t('panel.notify_due_on', { date: this._formatDate(due), time })
            : this._t('panel.notify_due_next', { time })
        );
      }
    }
    return lines.join(' ');
  }

  private _setCompleting(taskId: string, active: boolean): void {
    this._completingIds = active
      ? [...this._completingIds.filter((id) => id !== taskId), taskId]
      : this._completingIds.filter((id) => id !== taskId);
  }

  private _flashCompleted(taskId: string): void {
    this._justCompletedIds = [...this._justCompletedIds.filter((id) => id !== taskId), taskId];
    setTimeout(() => {
      this._justCompletedIds = this._justCompletedIds.filter((id) => id !== taskId);
    }, COMPLETE_FLASH_MS);
  }

  private _setRowError(taskId: string, message: string): void {
    this._rowErrors = { ...this._rowErrors, [taskId]: message };
  }

  private _clearRowError(taskId: string): void {
    if (!(taskId in this._rowErrors)) return;
    const next = { ...this._rowErrors };
    delete next[taskId];
    this._rowErrors = next;
  }

  private async _runServiceOrWs(
    task: Task,
    service: string,
    serviceData: Record<string, unknown>,
    wsType: string,
    wsPayload: Record<string, unknown>
  ): Promise<void> {
    const eid = this._getTaskEntityId(task);
    if (eid) {
      await this.hass.callService('upkeep', service, { entity_id: eid, ...serviceData });
      return;
    }
    await this._sendCommand({ type: wsType, task_id: task.id, ...wsPayload });
  }

  protected render() {
    if (!this.hass) {
      return html`<div class="panel">${localize('panel.loading')}</div>`;
    }

    const tasks = this._filteredTasks();
    const editorOpen = this._formMode !== 'none';

    const narrow = this._isNarrow();
    const filteredEmpty = tasks.length === 0;

    return html`
      <div
        class="panel ${narrow ? 'narrow' : ''} ${editorOpen ? 'form-open' : ''}"
        @click=${this._onPanelClick}
      >
        <div class="header">
          <div class="header-copy">
            <h1>Upkeep</h1>
            <p class="subtitle">${this._summary()}</p>
          </div>
          <button type="button" class="btn btn-header" @click=${() => this._startAdd()}>
            ${this._t('panel.new_task')}
          </button>
        </div>

        <div class="filter-bar">
          ${FILTERS.map((value) => {
            const count = this._filterCount(value);
            return html`
              <button
                type="button"
                class="filter-chip ${this._filter === value ? 'active' : ''}"
                @click=${() => {
                  this._filter = value;
                }}
              >
                ${this._filterLabel(value, count)} ${count}
              </button>
            `;
          })}
        </div>

        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}

        <div class="workspace ${editorOpen ? 'split' : ''} ${this.narrow ? 'stacked' : ''}">
          <div class="task-list">
            ${filteredEmpty ? this._renderEmpty() : tasks.map((task) => this._renderTask(task))}
          </div>
          ${editorOpen ? this._renderTaskForm() : nothing}
        </div>
        ${narrow && !editorOpen
          ? html`
              <button type="button" class="fab" @click=${() => this._startAdd()}>
                <ha-icon icon="mdi:plus"></ha-icon>
                ${this._t('panel.new_task')}
              </button>
            `
          : nothing}
        ${narrow ? this._renderSheet() : nothing}
      </div>
    `;
  }

  private _renderEmpty() {
    if (this._tasks.length === 0 || this._filter === 'all') {
      return html`<div class="empty">
        ${this._t('panel.empty', { add: this._t('panel.new_task') })}
      </div>`;
    }
    const key = this._filter;
    return html`
      <div class="empty empty-filter">
        <p class="empty-title">${this._t(`panel.empty_${key}_title`)}</p>
        <p>${this._t(`panel.empty_${key}_body`)}</p>
        <button
          type="button"
          class="btn btn-secondary"
          @click=${() => {
            this._filter = 'all';
          }}
        >
          ${this._t('panel.show_all')}
        </button>
      </div>
    `;
  }

  private _renderTaskForm() {
    const isEdit = this._formMode === 'edit';
    const isFrequency = this._draftTaskType === 'frequency';

    const titleMissing = this._draftTitle.trim().length === 0;
    const notifyBefore = !isFrequency && this._draftNotifyBefore;
    const notifyOn = notifyBefore || this._draftNotifyWhenDue;
    const serviceMissing = notifyOn && this._draftNotifyService.trim().length === 0;
    const notifyServices = this._notifyServiceOptions();

    const periods = ['days', 'weeks', 'months'] as const;

    return html`
      <form
        class="task-form"
        method="post"
        aria-labelledby="task-form-heading"
        @submit=${this._onFormSubmit}
      >
        <div class="form-heading">
          <h3 id="task-form-heading">
            ${isEdit ? this._t('panel.edit_task') : this._t('panel.add_task')}
          </h3>
          <button
            type="button"
            class="btn btn-icon"
            aria-label=${this._t('panel.cancel')}
            @click=${this._cancelForm}
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="identity-card">
          <div class="title-row">
            <div class="icon-picker-wrap">
              <span class="field-caption">${this._t('panel.icon')}</span>
              <button
                type="button"
                class="icon-button"
                aria-label=${this._t('panel.icon')}
                aria-expanded=${this._iconPickerOpen}
                @click=${() => {
                  this._iconPickerOpen = !this._iconPickerOpen;
                }}
              >
                <ha-icon .icon=${this._draftIcon}></ha-icon>
                <span class="icon-badge" aria-hidden="true">
                  <ha-icon icon="mdi:pencil"></ha-icon>
                </span>
              </button>
            </div>
            <label class="form-field-label" for="task-title">
              <span class="field-caption">${this._t('panel.title')}</span>
              <input
                id="task-title"
                name="title"
                type="text"
                required
                enterkeyhint="next"
                .value=${this._draftTitle}
                @input=${this._onTitleInput}
                placeholder=${this._t('panel.title_placeholder')}
              />
            </label>
          </div>
          ${this._iconPickerOpen
            ? html`
                <ha-icon-picker
                  .hass=${this.hass}
                  .value=${this._draftIcon}
                  @value-changed=${this._onIconChanged}
                ></ha-icon-picker>
              `
            : nothing}
          <div class="form-row">
            <label class="form-field-label" for="task-description">
              <span>${this._t('panel.description_optional')}</span>
              <textarea
                id="task-description"
                name="description"
                rows="2"
                .value=${this._draftDescription}
                @input=${this._onDescriptionInput}
                placeholder=${this._t('panel.description_placeholder')}
              ></textarea>
            </label>
          </div>
        </div>
        ${isFrequency
          ? html`
              <div class="form-row">
                <label class="form-field-label" for="task-frequency-target">
                  <span>${this._t('panel.target_uses')}</span>
                  <input
                    id="task-frequency-target"
                    name="frequency_target"
                    type="number"
                    .value=${this._draftFrequencyTarget}
                    @input=${this._onFrequencyTargetInput}
                    min="1"
                  />
                </label>
              </div>
            `
          : html`
              <fieldset class="repeat-fieldset">
                <legend>${this._t('panel.repeat')}</legend>
                <div class="repeat-row">
                  <label class="form-field-label schedule-field" for="task-interval">
                    <span>${this._t('panel.every')}</span>
                    <input
                      id="task-interval"
                      name="interval"
                      class="interval-input"
                      type="number"
                      .value=${this._draftInterval}
                      @input=${this._onIntervalInput}
                      min="1"
                      required
                    />
                  </label>
                  <div class="segments" role="radiogroup" aria-label=${this._t('panel.period')}>
                    ${periods.map(
                      (period) => html`
                        <label class="segment">
                          <input
                            type="radio"
                            name="period"
                            value=${period}
                            .checked=${this._draftPeriod === period}
                            @change=${() => {
                              this._draftPeriod = period;
                            }}
                          />
                          <span>${this._t(`panel.unit_${period}_other`)}</span>
                        </label>
                      `
                    )}
                  </div>
                </div>
                <p class="schedule-preview">${this._schedulePreview()}</p>
              </fieldset>
            `}
        <fieldset class="notify-fieldset">
          <legend>${this._t('panel.notifications')}</legend>
          ${isFrequency
            ? nothing
            : html`
                <label class="switch-field" for="task-notify-before">
                  <span>${this._t('panel.notify_before')}</span>
                  <input
                    id="task-notify-before"
                    name="notify_before"
                    type="checkbox"
                    role="switch"
                    switch
                    .checked=${notifyBefore}
                    @change=${this._onNotifyBeforeChange}
                  />
                </label>
              `}
          ${notifyBefore
            ? html`
                <div class="form-row schedule-row">
                  <label class="form-field-label schedule-field" for="task-notify-ahead">
                    <span>${this._t('panel.notify_ahead')}</span>
                    <input
                      id="task-notify-ahead"
                      name="notify_before_value"
                      class="interval-input"
                      type="number"
                      .value=${this._draftNotifyBeforeValue}
                      @input=${this._onNotifyAheadInput}
                      min="1"
                      inputmode="numeric"
                      required
                    />
                  </label>
                  <label class="form-field-label schedule-field" for="task-notify-unit">
                    <span>${this._t('panel.period')}</span>
                    <select
                      id="task-notify-unit"
                      name="notify_before_unit"
                      class="period-select"
                      .value=${this._draftNotifyBeforeUnit}
                      @change=${this._onNotifyUnitChange}
                    >
                      ${periods.map(
                        (period) => html`
                          <option
                            value=${period}
                            ?selected=${this._draftNotifyBeforeUnit === period}
                          >
                            ${this._t(`panel.unit_${period}_other`)}
                          </option>
                        `
                      )}
                    </select>
                  </label>
                </div>
              `
            : nothing}
          <label class="switch-field" for="task-notify-due">
            <span>${this._t('panel.notify_when_due')}</span>
            <input
              id="task-notify-due"
              name="notify_when_due"
              type="checkbox"
              role="switch"
              switch
              .checked=${this._draftNotifyWhenDue}
              @change=${this._onNotifyDueChange}
            />
          </label>
          ${notifyOn
            ? html`
                <div class="form-row">
                  <label class="form-field-label" for="task-notify-service">
                    <span>${this._t('panel.notify_service')}</span>
                    <select
                      id="task-notify-service"
                      name="notify_service"
                      .value=${this._draftNotifyService}
                      @change=${this._onNotifyServiceChange}
                      required
                    >
                      ${notifyServices.map(
                        (service) => html`
                          <option
                            value=${service.id}
                            ?selected=${service.id === this._draftNotifyService}
                          >
                            ${service.name}
                          </option>
                        `
                      )}
                    </select>
                  </label>
                </div>
                <p class="notice-hint">${this._noticeForecast()}</p>
              `
            : nothing}
        </fieldset>
        <div class="form-actions">
          ${isEdit
            ? html`
                <button type="button" class="btn btn-danger" @click=${() => this._deleteEditing()}>
                  ${this._t('panel.delete_task_label')}
                </button>
              `
            : nothing}
          <button type="button" class="btn btn-secondary" @click=${this._cancelForm}>
            ${this._t('panel.cancel')}
          </button>
          <button type="submit" class="btn btn-done" ?disabled=${titleMissing || serviceMissing}>
            ${isEdit ? this._t('panel.save') : this._t('panel.add_task')}
          </button>
        </div>
      </form>
    `;
  }

  private _onFormSubmit = (ev: Event): void => {
    ev.preventDefault();
    if (!this._draftTitle.trim()) return;
    const notifyBefore = this._draftTaskType !== 'frequency' && this._draftNotifyBefore;
    if ((notifyBefore || this._draftNotifyWhenDue) && !this._draftNotifyService.trim()) {
      return;
    }
    if (this._formMode === 'edit') {
      void this._submitEdit();
      return;
    }
    void this._submitAdd();
  };

  private _startAdd(): void {
    this._openMenuId = null;
    this._iconPickerOpen = false;
    this._formMode = 'add';
    this._editingTaskId = null;
    this._resetDraftFields();
  }

  private _cancelForm(): void {
    this._formMode = 'none';
    this._editingTaskId = null;
    this._resetDraftFields();
  }

  private _startEdit(task: Task): void {
    this._formMode = 'edit';
    this._editingTaskId = task.id;
    this._loadDraftFromTask(task);
  }

  private _loadDraftFromTask(task: Task): void {
    this._draftTitle = task.title;
    this._draftDescription = task.description ?? '';
    this._draftIcon = task.icon || DEFAULT_ICON;
    this._draftTaskType = task.task_type === 'frequency' ? 'frequency' : 'time';
    this._draftInterval = String(task.interval_value ?? 90);
    this._draftPeriod = task.interval_type ?? 'days';
    this._draftFrequencyTarget = String(task.frequency_target ?? 10);
    this._draftNotifyBefore = task.task_type !== 'frequency' && Boolean(task.notify_before);
    this._draftNotifyBeforeValue = String(task.notify_before_value ?? 7);
    this._draftNotifyBeforeUnit = task.notify_before_unit ?? 'days';
    this._draftNotifyWhenDue = Boolean(task.notify_when_due);
    this._draftNotifyService = (task.notify_service ?? '').replace(/^notify\./, '');
    if (this._draftNotifyService === 'send_message') this._draftNotifyService = '';
    if (
      (this._draftNotifyBefore || this._draftNotifyWhenDue) &&
      this._draftNotifyService.trim().length === 0
    ) {
      this._draftNotifyService = 'persistent_notification';
    }
  }

  private _resetDraftFields(): void {
    this._draftTitle = '';
    this._draftDescription = '';
    this._draftIcon = DEFAULT_ICON;
    this._draftInterval = '90';
    this._draftPeriod = 'days';
    this._draftTaskType = 'time';
    this._draftFrequencyTarget = '10';
    this._draftNotifyBefore = false;
    this._draftNotifyBeforeValue = '7';
    this._draftNotifyBeforeUnit = 'days';
    this._draftNotifyWhenDue = false;
    this._draftNotifyService = '';
  }

  private _onTitleInput = (ev: Event): void => {
    const target = ev.target as HTMLInputElement & { value?: string };
    this._draftTitle = target?.value ?? '';
  };

  private _onIntervalInput = (ev: Event): void => {
    const target = ev.target as HTMLInputElement & { value?: string };
    this._draftInterval = target?.value ?? '90';
  };

  private _onDescriptionInput = (ev: Event): void => {
    const target = ev.target as HTMLInputElement & { value?: string };
    this._draftDescription = target?.value ?? '';
  };

  private _onIconChanged = (ev: CustomEvent): void => {
    const value = (ev.detail as { value?: string })?.value;
    this._draftIcon = value?.trim() || DEFAULT_ICON;
  };

  private _onFrequencyTargetInput = (ev: Event): void => {
    const target = ev.target as HTMLInputElement;
    this._draftFrequencyTarget = target?.value ?? '10';
  };

  private _onNotifyBeforeChange = (ev: Event): void => {
    this._draftNotifyBefore = (ev.target as HTMLInputElement).checked;
    if (this._draftNotifyBefore || this._draftNotifyWhenDue) {
      this._ensureNotifyService();
    }
  };

  private _onNotifyDueChange = (ev: Event): void => {
    this._draftNotifyWhenDue = (ev.target as HTMLInputElement).checked;
    if (this._draftNotifyBefore || this._draftNotifyWhenDue) {
      this._ensureNotifyService();
    }
  };

  private _onNotifyAheadInput = (ev: Event): void => {
    const target = ev.target as HTMLInputElement;
    this._draftNotifyBeforeValue = target?.value ?? '7';
  };

  private _onNotifyUnitChange = (ev: Event): void => {
    const target = ev.target as HTMLSelectElement;
    this._draftNotifyBeforeUnit = target?.value ?? 'days';
  };

  private _onNotifyServiceChange = (ev: Event): void => {
    const target = ev.target as HTMLSelectElement;
    this._draftNotifyService = target?.value ?? '';
  };

  private _ensureNotifyService(): void {
    if (this._draftNotifyService.trim().length > 0) return;
    const services = this._notifyServiceOptions();
    const persistent = services.find((service) => service.id === 'persistent_notification');
    this._draftNotifyService = persistent?.id ?? services[0]?.id ?? '';
  }

  private _notifyServiceOptions(): Array<{ id: string; name: string }> {
    const domain = this.hass?.services?.notify ?? {};
    const options = Object.entries(domain)
      .filter(([id]) => id !== 'send_message')
      .map(([id, service]) => {
        if (id === 'persistent_notification') {
          return { id, name: this._t('panel.notify_service_persistent') };
        }
        const name = (service as { name?: string }).name;
        return { id, name: name && name.trim().length > 0 ? name : id };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (
      this._draftNotifyService &&
      !options.some((service) => service.id === this._draftNotifyService)
    ) {
      options.unshift({ id: this._draftNotifyService, name: this._draftNotifyService });
    }
    return options;
  }

  private _notifyAheadValue(): number {
    const parsed = parseInt(this._draftNotifyBeforeValue, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 7;
  }

  private _noticeUpdates(): Record<string, unknown> {
    const notifyBefore = this._draftTaskType !== 'frequency' && this._draftNotifyBefore;
    return {
      notify_before: notifyBefore,
      notify_before_value: this._notifyAheadValue(),
      notify_before_unit: this._draftNotifyBeforeUnit,
      notify_when_due: this._draftNotifyWhenDue,
      notify_service: this._draftNotifyService.trim() || null,
    };
  }

  private _submitAdd = async () => {
    const title = this._draftTitle.trim();
    if (!title) return;
    const interval = parseInt(this._draftInterval, 10) || 90;
    const interval_type = this._draftPeriod;
    try {
      await this._sendCommand({
        type: 'upkeep/add_task',
        title,
        description: this._draftDescription.trim() || undefined,
        icon: this._draftIcon,
        interval_value: interval,
        interval_type,
        ...this._noticeUpdates(),
      });
      this._cancelForm();
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _submitEdit = async () => {
    const taskId = this._editingTaskId;
    if (!taskId) return;
    const title = this._draftTitle.trim();
    if (!title) return;

    const updates: Record<string, unknown> = {
      title,
      description: this._draftDescription.trim() || null,
      icon: this._draftIcon,
      ...this._noticeUpdates(),
    };

    if (this._draftTaskType === 'frequency') {
      updates.frequency_target = parseInt(this._draftFrequencyTarget, 10) || 10;
    } else {
      updates.interval_value = parseInt(this._draftInterval, 10) || 90;
      updates.interval_type = this._draftPeriod;
    }

    try {
      await this._sendCommand({
        type: 'upkeep/update_task',
        task_id: taskId,
        updates,
      });
      this._cancelForm();
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _renderMobileTask(
    task: Task,
    view: {
      urgency: string;
      metaColor: string;
      metaText: string;
      progress: number;
      urgent: boolean;
      isSnoozed: boolean;
      justCompleted: boolean;
      isEditing: boolean;
      rowError?: string;
    }
  ) {
    const chip = view.isSnoozed ? 'snoozed' : view.urgency === 'on_track' ? null : view.urgency;
    const fill = Math.max(2, Math.min(100, view.progress));
    const isCompleting = this._completingIds.includes(task.id);

    return html`
      <div
        class="task-row mobile-row ${view.urgency} ${view.isSnoozed
          ? 'snoozed'
          : ''} ${view.justCompleted ? 'done-anim' : ''} ${view.isEditing ? 'editing' : ''}"
      >
        <button type="button" class="task-open" @click=${() => this._startEdit(task)}>
          <span
            class="icon-tile"
            style="color:${view.metaColor}; background: color-mix(in srgb, ${view.metaColor} 16%, transparent)"
          >
            <ha-icon .icon=${task.icon || 'mdi:calendar-check'}></ha-icon>
          </span>
          <span class="mobile-copy">
            <span class="mobile-title-line">
              <span class="task-title">${task.title}</span>
              ${chip
                ? html`<span
                    class="status-chip"
                    style="color:${view.metaColor}; background: color-mix(in srgb, ${view.metaColor} 16%, transparent)"
                    >${this._filterLabel(
                      chip === 'snoozed' ? 'snoozed' : (chip as (typeof FILTERS)[number]),
                      1
                    )}</span
                  >`
                : nothing}
            </span>
            <span class="mobile-meta">
              <span style="color:${view.metaColor}">${view.metaText}</span>
              ${task.task_type === 'frequency' || !task.last_performed
                ? nothing
                : html`<span>
                    ·
                    ${this._formatDate(
                      scheduledDueDate(
                        new Date(task.last_performed),
                        task.interval_value ?? 30,
                        task.interval_type ?? 'days'
                      )
                    )}</span
                  >`}
            </span>
            <span class="meter" aria-hidden="true">
              <span class="meter-fill" style="width:${fill}%; background:${view.metaColor}"></span>
            </span>
          </span>
        </button>
        ${view.justCompleted
          ? html`<span class="done-check"><ha-icon icon="mdi:check-circle"></ha-icon></span>`
          : view.isSnoozed
            ? nothing
            : html`
                <button
                  type="button"
                  class="btn-check ${view.urgent ? 'urgent' : ''}"
                  aria-label=${`${this._t('panel.complete')}: ${task.title}`}
                  ?disabled=${isCompleting}
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    void this._completeTask(task);
                  }}
                >
                  <span>
                    <ha-icon icon="mdi:check"></ha-icon>
                  </span>
                </button>
              `}
        <button
          type="button"
          class="btn-more"
          aria-label=${this._t('panel.more_actions')}
          aria-haspopup="dialog"
          aria-expanded=${this._openMenuId === task.id}
          @click=${(event: Event) => {
            event.stopPropagation();
            this._openMenuId = task.id;
          }}
        >
          <ha-icon icon="mdi:dots-vertical"></ha-icon>
        </button>
        ${view.rowError ? html`<div class="row-error">${view.rowError}</div>` : nothing}
      </div>
    `;
  }

  private _renderSheet() {
    const task = this._tasks.find((item) => item.id === this._openMenuId);
    const status = task ? this._getTaskStatus(task) : null;
    const color = status ? getUrgencyColor(status.urgency) : 'inherit';
    const snoozed = task ? !task.enabled : false;

    return html`
      <dialog
        class="sheet"
        closedby="any"
        aria-labelledby="sheet-title"
        @close=${this._onSheetClose}
      >
        <span class="sheet-handle" aria-hidden="true"></span>
        ${task
          ? html`
              <div class="sheet-head">
                <span
                  class="icon-tile"
                  style="color:${color}; background: color-mix(in srgb, ${color} 16%, transparent)"
                >
                  <ha-icon .icon=${task.icon || 'mdi:calendar-check'}></ha-icon>
                </span>
                <span>
                  <span class="sheet-title" id="sheet-title">${task.title}</span>
                  <span class="sheet-meta">${this._taskSchedule(task)}</span>
                </span>
              </div>
              <div class="sheet-rule"></div>
              ${snoozed
                ? html`
                    <button
                      type="button"
                      class="sheet-action"
                      @click=${() => {
                        this._openMenuId = null;
                        void this._enableTask(task);
                      }}
                    >
                      <ha-icon icon="mdi:play"></ha-icon>
                      ${this._t('panel.enable')}
                    </button>
                  `
                : html`
                    <button
                      type="button"
                      class="sheet-action"
                      @click=${() => {
                        this._openMenuId = null;
                        void this._snoozeTask(task);
                      }}
                    >
                      <ha-icon icon="mdi:clock-outline"></ha-icon>
                      ${this._t('panel.snooze')}
                    </button>
                  `}
              <button
                type="button"
                class="sheet-action"
                @click=${() => {
                  this._openMenuId = null;
                  this._startEdit(task);
                }}
              >
                <ha-icon icon="mdi:pencil"></ha-icon>
                ${this._t('panel.edit')}
              </button>
              ${task.task_type === 'frequency'
                ? html`
                    <button
                      type="button"
                      class="sheet-action"
                      @click=${() => {
                        this._openMenuId = null;
                        void this._incrementTask(task);
                      }}
                    >
                      <ha-icon icon="mdi:plus"></ha-icon>
                      ${this._t('panel.increment')}
                    </button>
                  `
                : nothing}
              <div class="sheet-rule"></div>
              <button
                type="button"
                class="sheet-action danger"
                @click=${() => this._deleteEditingTask(task)}
              >
                <ha-icon icon="mdi:delete"></ha-icon>
                ${this._t('panel.delete')}
              </button>
            `
          : html`<span id="sheet-title" class="visually-hidden"
              >${this._t('panel.more_actions')}</span
            >`}
      </dialog>
    `;
  }

  private _deleteEditingTask(task: Task): void {
    void this._deleteTask(task).then((removed) => {
      if (removed) {
        this._openMenuId = null;
        if (this._editingTaskId === task.id) this._cancelForm();
      }
    });
  }

  private _renderTask(task: Task) {
    const status = this._getTaskStatus(task);
    const { urgency, days_remaining, progress } = status;
    const isSnoozed = !task.enabled;
    const locale = this._locale();
    const metaColor = getUrgencyColor(urgency);
    const taskType = task.task_type === 'frequency' ? 'frequency' : 'time';
    const metaText =
      task.task_type === 'frequency'
        ? this._t('panel.uses_progress', {
            current: task.current_count ?? 0,
            target: task.frequency_target ?? 0,
          })
        : formatDaysRemaining(days_remaining, locale, taskType);
    const rowError = this._rowErrors[task.id];
    const justCompleted = this._justCompletedIds.includes(task.id);
    const isEditing = this._editingTaskId === task.id && this._formMode === 'edit';
    const urgent = urgency === 'overdue' || urgency === 'due_soon';

    if (this._isNarrow()) {
      return this._renderMobileTask(task, {
        urgency,
        metaColor,
        metaText,
        progress,
        urgent,
        isSnoozed,
        justCompleted,
        isEditing,
        rowError,
      });
    }

    return html`
      <div
        class="task-row ${urgency} ${isSnoozed ? 'snoozed' : ''} ${justCompleted
          ? 'done-anim'
          : ''} ${isEditing ? 'editing' : ''}"
      >
        <button type="button" class="task-open" @click=${() => this._startEdit(task)}>
          <ha-icon .icon=${task.icon || 'mdi:calendar-check'} style="color:${metaColor}"></ha-icon>
          <span class="task-copy">
            <span class="task-title">${task.title}</span>
            <span class="task-schedule">${this._taskSchedule(task)}</span>
          </span>
        </button>
        <div class="task-progress">
          <span class="task-meta" style="color:${metaColor}">${metaText}</span>
          <div
            class="meter"
            role="meter"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow=${Math.round(progress)}
            aria-label=${metaText}
          >
            <span
              class="meter-fill"
              style="width:${Math.min(100, Math.max(0, progress))}%; background:${metaColor}"
            ></span>
          </div>
        </div>
        ${this._renderTaskActions(task, isSnoozed, urgent)}
        ${rowError ? html`<div class="row-error">${rowError}</div>` : nothing}
      </div>
    `;
  }

  private _taskSchedule(task: Task): string {
    if (task.task_type === 'frequency') {
      return this._t('panel.frequency_uses');
    }
    const value = task.interval_value ?? 30;
    const unit = task.interval_type ?? 'days';
    const every = this._t('panel.every_phrase', { value, unit: this._unitWord(unit, value) });
    if (!task.enabled && task.snoozed_until) {
      const snooze = new Date(task.snoozed_until);
      if (!Number.isNaN(snooze.getTime())) {
        return `${every} · ${this._t('panel.snoozed_until', { date: this._formatDate(snooze) })}`;
      }
    }
    if (!task.last_performed) return every;
    const due = scheduledDueDate(new Date(task.last_performed), value, unit);
    return `${every} · ${this._t('panel.due_on', { date: this._formatDate(due) })}`;
  }

  private _renderTaskActions(task: Task, isSnoozed: boolean, urgent: boolean) {
    const isCompleting = this._completingIds.includes(task.id);
    const justCompleted = this._justCompletedIds.includes(task.id);
    const menuOpen = this._openMenuId === task.id;

    if (justCompleted) {
      return html`
        <div class="task-actions">
          <div class="done-check">
            <ha-icon icon="mdi:check-circle"></ha-icon>
          </div>
        </div>
      `;
    }

    return html`
      <div class="task-actions">
        ${isSnoozed
          ? html`
              <button
                type="button"
                class="btn btn-secondary"
                @click=${() => this._enableTask(task)}
              >
                ${this._t('panel.enable')}
              </button>
            `
          : html`
              ${urgent
                ? html`
                    <button
                      type="button"
                      class="btn btn-secondary"
                      @click=${() => this._snoozeTask(task)}
                    >
                      ${this._t('panel.snooze')}
                    </button>
                  `
                : nothing}
              <button
                type="button"
                class="btn btn-complete ${urgent ? 'urgent' : 'quiet'}"
                ?disabled=${isCompleting}
                @click=${() => this._completeTask(task)}
              >
                ${isCompleting ? '…' : this._t('panel.complete')}
              </button>
            `}
        <div class="menu">
          <button
            type="button"
            class="btn btn-icon"
            aria-label=${this._t('panel.more_actions')}
            aria-haspopup="menu"
            aria-expanded=${menuOpen}
            @click=${() => {
              this._openMenuId = menuOpen ? null : task.id;
            }}
          >
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </button>
          ${menuOpen
            ? html`
                <div class="row-menu" role="menu">
                  ${isSnoozed
                    ? nothing
                    : html`
                        <button
                          type="button"
                          role="menuitem"
                          @click=${() => {
                            this._openMenuId = null;
                            void this._snoozeTask(task);
                          }}
                        >
                          ${this._t('panel.snooze')}
                        </button>
                      `}
                  <button
                    type="button"
                    role="menuitem"
                    @click=${() => {
                      this._openMenuId = null;
                      this._startEdit(task);
                    }}
                  >
                    ${this._t('panel.edit')}
                  </button>
                  ${task.task_type === 'frequency'
                    ? html`
                        <button
                          type="button"
                          role="menuitem"
                          @click=${() => {
                            this._openMenuId = null;
                            void this._incrementTask(task);
                          }}
                        >
                          ${this._t('panel.increment')}
                        </button>
                      `
                    : nothing}
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _onPanelClick = (ev: Event): void => {
    const path = ev.composedPath();
    const insideMenu = path.some(
      (node) =>
        node instanceof HTMLElement &&
        (node.classList.contains('menu') || node.classList.contains('sheet'))
    );
    if (!insideMenu) this._openMenuId = null;
  };

  private _deleteEditing(): void {
    const task = this._tasks.find((item) => item.id === this._editingTaskId);
    if (!task) return;
    void this._deleteTask(task).then((removed) => {
      if (removed) this._cancelForm();
    });
  }

  private _incrementTask = async (task: Task) => {
    this._clearRowError(task.id);
    try {
      await this._runServiceOrWs(task, 'increment_counter', {}, 'upkeep/increment_counter', {});
      this._refresh();
    } catch (e) {
      this._setRowError(task.id, (e as Error).message);
    }
  };

  private _completeTask = async (task: Task) => {
    this._clearRowError(task.id);
    this._setCompleting(task.id, true);
    try {
      await this._runServiceOrWs(task, 'complete_task', {}, 'upkeep/complete_task', {});
      this._setCompleting(task.id, false);
      this._flashCompleted(task.id);
      this._refresh();
    } catch (e) {
      this._setCompleting(task.id, false);
      this._setRowError(task.id, (e as Error).message);
    }
  };

  private _snoozeTask = async (task: Task) => {
    this._clearRowError(task.id);
    try {
      await this._runServiceOrWs(task, 'snooze_task', { disable: true }, 'upkeep/snooze_task', {
        disable: true,
      });
      this._refresh();
    } catch (e) {
      this._setRowError(task.id, (e as Error).message);
    }
  };

  private _enableTask = async (task: Task) => {
    this._clearRowError(task.id);
    try {
      await this._runServiceOrWs(task, 'enable_task', {}, 'upkeep/enable_task', {});
      this._refresh();
    } catch (e) {
      this._setRowError(task.id, (e as Error).message);
    }
  };

  private _deleteTask = async (task: Task): Promise<boolean> => {
    if (!confirm(this._t('panel.delete_confirm', { title: task.title }))) return false;
    this._clearRowError(task.id);
    try {
      await this._sendCommand({ type: 'upkeep/remove_task', task_id: task.id });
      this._refresh();
      return true;
    } catch (e) {
      this._setRowError(task.id, (e as Error).message);
      return false;
    }
  };

  static get styles() {
    return css`
      .panel {
        padding: 16px;
        max-width: 1100px;
        margin: 0 auto;
        font-family: Roboto, var(--paper-font-body1_-_font-family, sans-serif);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }
      .subtitle {
        margin: 4px 0 0;
        color: var(--secondary-text-color);
        font-size: 13px;
      }
      .workspace {
        display: block;
      }
      .workspace.split {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
        gap: 16px;
        align-items: start;
      }
      .workspace.stacked,
      .workspace.split.stacked {
        display: block;
      }
      @media (max-width: 800px) {
        .workspace.split {
          display: block;
        }
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .filter-bar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .filter-chip {
        padding: 0 14px;
        min-block-size: 32px;
        display: inline-flex;
        align-items: center;
        border-radius: 16px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .filter-chip:hover {
        border-color: var(--primary-color);
      }
      .filter-chip.active {
        background: var(--primary-color);
        color: #102027;
        border-color: var(--primary-color);
      }
      .btn {
        border: none;
        border-radius: 8px;
        padding: 0 14px;
        height: 32px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.15s ease;
        white-space: nowrap;
        box-sizing: border-box;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-done,
      .btn-complete.urgent,
      .btn-header {
        background: var(--primary-color);
        color: #102027;
      }
      .btn-complete.quiet {
        background: transparent;
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
      }
      .btn-danger {
        background: transparent;
        color: var(--error-color, #f44336);
        border: 1px solid var(--error-color, #f44336);
        margin-inline-end: auto;
      }
      .btn-done:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      .btn-secondary {
        background: transparent;
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--secondary-background-color);
        border-color: var(--primary-color);
      }
      .btn-header {
        border-radius: 16px;
        padding: 0 16px;
      }
      .btn-icon {
        width: 32px;
        padding: 0;
        background: transparent;
        color: var(--secondary-text-color);
        border: 1px solid var(--divider-color);
      }
      .btn-icon:hover:not(:disabled) {
        color: var(--error-color);
        border-color: var(--error-color);
        background: var(--secondary-background-color);
      }
      .btn-icon ha-icon {
        --mdc-icon-size: 18px;
      }
      .task-form {
        background: var(--card-background-color);
        border-radius: 12px;
        padding: 16px 16px 20px;
        margin-bottom: 16px;
        border: 1px solid var(--divider-color);
      }
      .task-form h3 {
        margin: 0;
        font-size: 16px;
      }
      .task-form ha-icon-picker {
        display: block;
        margin: 0 0 16px;
        max-width: 100%;
      }
      .icon-field-label {
        width: 100%;
      }
      .icon-field-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .icon-preview {
        --mdc-icon-size: 32px;
        color: var(--primary-color);
        flex-shrink: 0;
      }
      .icon-field-row ha-icon-picker {
        flex: 1;
        min-width: 0;
      }
      .form-field-label input:disabled {
        opacity: 0.7;
        cursor: default;
      }
      .form-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
        margin-bottom: 16px;
      }
      .form-field-label {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .form-field-label input,
      .form-field-label select,
      .form-field-label textarea {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        padding: 0 12px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
      }
      .form-field-label textarea {
        height: auto;
        min-height: 72px;
        padding: 12px;
        resize: vertical;
        line-height: 1.45;
      }
      .form-field-label input:focus-visible,
      .form-field-label select:focus-visible,
      .form-field-label textarea:focus-visible {
        border-color: var(--primary-color);
      }
      .field-caption,
      .icon-badge {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
      .schedule-field {
        flex: 0 0 auto;
      }
      .schedule-field input.interval-input {
        width: 5.5rem;
      }
      .schedule-field select.period-select {
        width: 8.5rem;
      }
      .notify-fieldset legend,
      .repeat-fieldset legend {
        padding: 0;
        margin-block-end: 10px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .check-field {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-block-size: 44px;
        cursor: pointer;
        font-size: 14px;
        color: var(--primary-text-color);
      }
      .check-field input[type='checkbox'] {
        accent-color: var(--primary-color);
        inline-size: 1.25em;
        block-size: 1.25em;
        margin: 0;
        flex-shrink: 0;
      }
      .check-field input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .form-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 16px;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }
      .title-row .form-field-label {
        margin: 0;
      }
      .icon-button {
        inline-size: 40px;
        block-size: 40px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-color);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .icon-button ha-icon {
        --mdc-icon-size: 22px;
      }
      .icon-button:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .repeat-fieldset,
      .notify-fieldset {
        border: 0;
        margin: 4px 0 20px;
        padding: 0;
        min-inline-size: 0;
      }
      .repeat-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 8px;
      }
      .segments {
        display: flex;
        flex: 1 1 auto;
        flex-wrap: wrap;
        gap: 6px;
        min-width: 0;
      }
      .segment {
        position: relative;
        min-block-size: 40px;
        display: inline-flex;
        align-items: center;
      }
      .segment input {
        position: absolute;
        inset: 0;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .segment span {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        min-block-size: 40px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 0 12px;
        color: var(--primary-text-color);
      }
      .segment:has(input:checked) span {
        background: var(--primary-color);
        color: #102027;
        border-color: var(--primary-color);
      }
      .segment:has(input:focus-visible) span {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .schedule-preview,
      .notice-hint {
        margin: 12px 0 0;
        color: var(--secondary-text-color);
        font-size: 13px;
        line-height: 1.45;
      }
      .switch-field {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-block-size: 44px;
        font-size: 14px;
        color: var(--primary-text-color);
      }
      .switch-field input {
        appearance: none;
        inline-size: 44px;
        block-size: 26px;
        margin: 0;
        border-radius: 999px;
        border: 0;
        background: var(--divider-color);
        position: relative;
        cursor: pointer;
        flex-shrink: 0;
      }
      .switch-field input::before {
        content: '';
        position: absolute;
        inset-block-start: 3px;
        inset-inline-start: 3px;
        inline-size: 20px;
        block-size: 20px;
        border-radius: 50%;
        background: #e1e1e1;
      }
      .switch-field input:checked {
        background: var(--primary-color);
      }
      .switch-field input:checked::before {
        inset-inline-start: calc(100% - 23px);
      }
      .switch-field input:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .visually-hidden {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
      .form-actions {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .task-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .task-row {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(140px, 0.9fr) auto;
        gap: 16px;
        align-items: center;
        padding: 14px 16px;
        background: var(--card-background-color);
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        transition:
          box-shadow 0.2s ease,
          border-color 0.2s ease;
      }
      .task-row.overdue {
        border-color: var(--error-color);
      }
      .task-row.due_soon {
        border-color: var(--warning-color);
      }
      .task-row.snoozed {
        opacity: 0.7;
      }
      .task-row.editing {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 1px var(--primary-color);
      }
      .task-row.done-anim {
        animation: donePop 0.4s ease;
      }
      .task-open {
        appearance: none;
        background: none;
        border: 0;
        color: inherit;
        font: inherit;
        text-align: start;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        padding: 0;
        cursor: pointer;
      }
      .task-open ha-icon {
        --mdc-icon-size: 24px;
        flex-shrink: 0;
      }
      .task-copy {
        min-width: 0;
      }
      .task-schedule {
        display: block;
        margin-top: 4px;
        color: var(--secondary-text-color);
        font-size: 12px;
        line-height: 1.35;
      }
      .task-progress {
        min-width: 0;
      }
      .meter {
        height: 4px;
        border-radius: 999px;
        background: var(--divider-color);
        overflow: hidden;
        margin-top: 8px;
      }
      .meter-fill {
        display: block;
        height: 100%;
      }
      .menu {
        position: relative;
      }
      .row-menu {
        position: absolute;
        inset-inline-end: 0;
        inset-block-start: calc(100% + 4px);
        z-index: 3;
        min-width: 160px;
        padding: 4px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        display: flex;
        flex-direction: column;
      }
      .row-menu button {
        appearance: none;
        background: none;
        border: 0;
        color: var(--primary-text-color);
        font: inherit;
        text-align: start;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
      }
      .row-menu button:hover,
      .row-menu button:focus-visible {
        background: var(--secondary-background-color);
      }
      .row-error {
        grid-column: 1 / -1;
      }
      @media (max-width: 720px) {
        .task-row {
          grid-template-columns: minmax(0, 1fr);
        }
        .task-progress,
        .task-actions {
          grid-column: 1 / -1;
        }
        .task-actions {
          justify-content: flex-end;
        }
      }
      .task-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }
      .task-info ha-icon {
        --mdc-icon-size: 24px;
        flex-shrink: 0;
      }
      .task-title {
        font-weight: 500;
        font-size: 14px;
      }
      .task-meta {
        font-size: 12px;
        font-weight: 500;
        margin-top: 2px;
      }
      .task-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .done-check {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        animation: popIn 0.3s ease;
      }
      .done-check ha-icon {
        --mdc-icon-size: 28px;
        color: var(--success-color, #4caf50);
      }
      .row-error {
        font-size: 12px;
        color: var(--error-color);
        padding: 4px 0 0 36px;
      }
      .error {
        color: var(--error-color);
        padding: 12px;
        margin-bottom: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }
      .empty {
        padding: 32px;
        text-align: center;
        color: var(--secondary-text-color);
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
      .panel.narrow .btn-header {
        display: none;
      }
      .panel.narrow .header h1 {
        font-size: 28px;
      }
      .panel.narrow .filter-bar {
        flex-wrap: nowrap;
        overflow-x: auto;
        margin-inline: -16px;
        padding: 0 16px 8px;
        gap: 8px;
      }
      .panel.narrow .filter-chip {
        flex-shrink: 0;
        min-block-size: 44px;
        border-radius: 22px;
        padding: 0 14px;
      }
      .panel.narrow .task-list {
        padding-bottom: 96px;
      }
      .panel.narrow .mobile-row {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 6px 10px 14px;
        border-radius: 16px;
      }
      .panel.narrow .mobile-row .task-open {
        flex: 1;
        min-width: 0;
        gap: 14px;
      }
      .icon-tile {
        flex-shrink: 0;
        inline-size: 44px;
        block-size: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
      }
      .icon-tile ha-icon {
        --mdc-icon-size: 24px;
      }
      .mobile-copy {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
        flex: 1;
      }
      .mobile-title-line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .mobile-title-line .task-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 16px;
      }
      .status-chip {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        block-size: 22px;
        padding: 0 8px;
        border-radius: 11px;
        font-size: 12px;
        font-weight: 500;
      }
      .mobile-meta {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .mobile-copy .meter {
        margin-top: 0;
      }
      .btn-check,
      .btn-more {
        flex-shrink: 0;
        inline-size: 44px;
        block-size: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: var(--primary-text-color);
        cursor: pointer;
      }
      .btn-check span {
        box-sizing: border-box;
        inline-size: 34px;
        block-size: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 17px;
        border: 1.5px solid var(--divider-color, #555);
        color: var(--primary-text-color);
      }
      .btn-check.urgent span {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: #102027;
      }
      .btn-check ha-icon,
      .btn-more ha-icon {
        --mdc-icon-size: 20px;
      }
      .btn-check:focus-visible,
      .btn-more:focus-visible,
      .fab:focus-visible,
      .sheet-action:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .fab {
        position: fixed;
        inset-inline-end: 16px;
        inset-block-end: calc(24px + env(safe-area-inset-bottom));
        z-index: 6;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        block-size: 56px;
        padding: 0 20px 0 16px;
        border: 0;
        border-radius: 16px;
        background: var(--primary-color);
        color: #102027;
        font: inherit;
        font-size: 15px;
        font-weight: 500;
        box-shadow: 0 6px 20px rgb(0 0 0 / 45%);
        cursor: pointer;
      }
      .fab ha-icon {
        --mdc-icon-size: 22px;
      }
      .panel.narrow.form-open .header,
      .panel.narrow.form-open .filter-bar,
      .panel.narrow.form-open .task-list {
        display: none;
      }
      .panel.narrow.form-open {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      .panel.narrow.form-open .workspace,
      .panel.narrow.form-open .workspace.split {
        display: flex;
        flex-direction: column;
      }
      .panel.narrow.form-open .task-form {
        display: flex;
        flex-direction: column;
        border: 0;
        background: transparent;
        padding: 0 0 12px;
        margin: 0;
      }
      .panel.narrow .form-heading {
        position: sticky;
        inset-block-start: 0;
        z-index: 4;
        justify-content: flex-start;
        gap: 4px;
        margin: 0 0 16px;
        padding: 6px 4px;
        background: var(--primary-background-color, var(--card-background-color));
        border-bottom: 1px solid var(--divider-color);
      }
      .panel.narrow .form-heading .btn-icon {
        order: -1;
      }
      .panel.narrow .field-caption {
        position: static;
        inline-size: auto;
        block-size: auto;
        margin: 0 0 8px;
        overflow: visible;
        clip-path: none;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      .panel.narrow .icon-picker-wrap {
        display: flex;
        flex-direction: column;
      }
      .panel.narrow .icon-button {
        position: relative;
        inline-size: 56px;
        block-size: 56px;
        border-radius: 14px;
      }
      .panel.narrow .icon-badge {
        position: absolute;
        inset-inline-end: -6px;
        inset-block-end: -6px;
        inline-size: 24px;
        block-size: 24px;
        margin: 0;
        overflow: visible;
        clip-path: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: var(--secondary-background-color, #3a3a3a);
        border: 2px solid var(--card-background-color);
        color: var(--primary-text-color);
      }
      .panel.narrow .icon-badge ha-icon {
        --mdc-icon-size: 12px;
      }
      .panel.narrow .title-row {
        align-items: flex-end;
      }
      .panel.narrow .identity-card,
      .panel.narrow .repeat-fieldset,
      .panel.narrow .notify-fieldset {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 0 0 16px;
        padding: 16px;
        border: 1px solid var(--divider-color);
        border-radius: 16px;
        background: var(--card-background-color);
      }
      .panel.narrow .form-field-label input,
      .panel.narrow .form-field-label select,
      .panel.narrow .segment span {
        min-block-size: 48px;
        font-size: 16px;
      }
      .panel.narrow .segments {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 3px;
        padding: 3px;
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        background: var(--secondary-background-color, #1b1b1b);
      }
      .panel.narrow .segment span {
        justify-content: center;
        border: 0;
        inline-size: 100%;
      }
      .panel.narrow .form-actions {
        position: sticky;
        inset-block-end: 0;
        z-index: 4;
        margin-top: 16px;
        margin-inline: -16px;
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
        background: var(--primary-background-color, var(--card-background-color));
        border-top: 1px solid var(--divider-color);
      }
      .panel.narrow .form-actions .btn-secondary {
        display: none;
      }
      .panel.narrow .form-actions .btn-done {
        flex: 1;
        block-size: 48px;
        font-size: 16px;
      }
      .panel.narrow .btn-danger {
        inline-size: 100%;
        block-size: 48px;
        margin: 0 0 8px;
      }
      .empty-filter {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        border: 1px dashed var(--divider-color);
        border-radius: 16px;
      }
      .empty-title {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .empty-filter p {
        margin: 0;
      }
      .empty-filter .btn {
        min-block-size: 44px;
        padding: 0 16px;
      }
      dialog.sheet {
        position: fixed;
        inset: auto 0 0 0;
        width: 100%;
        max-width: 100%;
        max-height: min(85vh, 100%);
        margin: 0;
        padding: 8px 8px calc(16px + env(safe-area-inset-bottom));
        border: 0;
        border-radius: 24px 24px 0 0;
        background: var(--card-background-color, #2b2b2b);
        color: var(--primary-text-color);
        box-shadow: 0 -8px 32px rgb(0 0 0 / 40%);
      }
      dialog.sheet[open] {
        display: flex;
        flex-direction: column;
      }
      dialog.sheet::backdrop {
        background: rgb(0 0 0 / 60%);
        overflow: hidden;
        overscroll-behavior: contain;
      }
      dialog.sheet:modal {
        overscroll-behavior: contain;
      }
      .sheet-handle {
        align-self: center;
        inline-size: 36px;
        block-size: 4px;
        margin: 4px 0 14px;
        border-radius: 2px;
        background: var(--divider-color, #5a5a5a);
      }
      .sheet-head {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 12px 16px;
      }
      .sheet-title,
      .sheet-meta {
        display: block;
      }
      .sheet-title {
        font-size: 17px;
        font-weight: 500;
      }
      .sheet-meta {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .sheet-rule {
        block-size: 1px;
        margin: 0 12px 8px;
        background: var(--divider-color);
      }
      .sheet-action {
        display: flex;
        align-items: center;
        gap: 16px;
        min-block-size: 52px;
        padding: 0 12px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: var(--primary-text-color);
        font: inherit;
        font-size: 16px;
        text-align: start;
        cursor: pointer;
      }
      .sheet-action.danger {
        color: var(--error-color, #f44336);
      }
      .sheet-action ha-icon {
        --mdc-icon-size: 20px;
      }
      @keyframes donePop {
        0% {
          transform: scale(1);
        }
        30% {
          transform: scale(0.98);
        }
        60% {
          transform: scale(1.01);
        }
        100% {
          transform: scale(1);
        }
      }
    `;
  }
}
