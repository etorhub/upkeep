import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import { formatDaysRemaining, getUrgencyColor } from '../src/utils';
import { computePanelTaskStatus } from './task-status';
import type { Task } from './types';

export type { Task } from './types';

const DUE_SOON_DAYS = 7;
const COMPLETE_FLASH_MS = 1500;

@customElement('upkeep-panel')
export class UpkeepPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow = false;

  @state() private _tasks: Task[] = [];
  @state() private _error: string | null = null;
  @state() private _showAddForm = false;
  @state() private _filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' = 'all';
  @state() private _draftTitle = '';
  @state() private _draftDescription = '';
  @state() private _draftInterval = '90';
  @state() private _draftPeriod = 'days';
  @state() private _completingIds: string[] = [];
  @state() private _justCompletedIds: string[] = [];
  @state() private _rowErrors: Record<string, string> = {};
  private _loadRequestId = 0;

  updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass') && this.hass?.connection && !this._showAddForm) {
      this._loadTasks();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hass?.connection) {
      this._loadTasks();
    }
  }

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
        this._error = err?.message ?? 'Failed to load tasks';
      });
  }

  private async _sendCommand<T>(msg: { type: string; [key: string]: unknown }): Promise<T> {
    return this.hass.connection.sendMessagePromise(msg) as Promise<T>;
  }

  private _refresh(): void {
    this._loadTasks({ silent: true });
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
      return html`<div class="panel">Loading...</div>`;
    }

    const tasks = this._filteredTasks();

    return html`
      <div class="panel">
        <div class="header">
          <h1>Upkeep</h1>
          <div class="header-actions">
            <div class="filter-bar">
              ${(['all', 'overdue', 'due_soon', 'on_track', 'snoozed'] as const).map(
                (f) => html`
                  <button
                    class="filter-chip ${this._filter === f ? 'active' : ''}"
                    @click=${() => {
                      this._filter = f;
                    }}
                  >
                    ${f.replace(/_/g, ' ')}
                  </button>
                `
              )}
            </div>
            <button class="btn btn-header" @click=${() => this._toggleAddForm()}>
              ${this._showAddForm ? 'Cancel' : 'Add Task'}
            </button>
          </div>
        </div>

        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}

        ${this._showAddForm ? this._renderAddForm() : nothing}

        <div class="task-list">
          ${tasks.length === 0
            ? html`<div class="empty">No tasks. Click "Add Task" to create one.</div>`
            : tasks.map((task) => this._renderTask(task))}
        </div>
      </div>
    `;
  }

  private _renderAddForm() {
    return html`
      <div class="add-form">
        <h3>Add Task</h3>
        <div class="form-row">
          <label class="form-field-label">
            <span>Title</span>
            <input
              type="text"
              id="add-title"
              .value=${this._draftTitle}
              @input=${this._onTitleInput}
              placeholder="e.g. Change air filter"
            />
          </label>
        </div>
        <div class="form-row">
          <label class="form-field-label">
            <span>Interval</span>
            <input
              type="number"
              id="add-interval"
              .value=${this._draftInterval}
              @input=${this._onIntervalInput}
              min="1"
            />
          </label>
          <label class="period-select-label">
            <span>Period</span>
            <select id="add-period" .value=${this._draftPeriod} @change=${this._onPeriodChange}>
              <option value="days" ?selected=${this._draftPeriod === 'days'}>Days</option>
              <option value="weeks" ?selected=${this._draftPeriod === 'weeks'}>Weeks</option>
              <option value="months" ?selected=${this._draftPeriod === 'months'}>Months</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="form-field-label">
            <span>Description (optional)</span>
            <input
              type="text"
              id="add-desc"
              .value=${this._draftDescription}
              @input=${this._onDescriptionInput}
              placeholder="Optional details..."
            />
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-done" @click=${this._submitAdd}>Add Task</button>
        </div>
      </div>
    `;
  }

  private _toggleAddForm(): void {
    this._showAddForm = !this._showAddForm;
    if (!this._showAddForm) {
      this._resetDraft();
    }
  }

  private _resetDraft(): void {
    this._draftTitle = '';
    this._draftDescription = '';
    this._draftInterval = '90';
    this._draftPeriod = 'days';
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

  private _onPeriodChange = (ev: Event): void => {
    const target = ev.target as HTMLSelectElement;
    this._draftPeriod = target?.value ?? 'days';
  };

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
        interval_value: interval,
        interval_type,
      });
      this._showAddForm = false;
      this._resetDraft();
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _renderTask(task: Task) {
    const { urgency, days_remaining } = this._getTaskStatus(task);
    const isSnoozed = !task.enabled;
    const locale = this._locale();
    const metaColor = getUrgencyColor(urgency);
    const taskType = task.task_type === 'frequency' ? 'frequency' : 'time';
    const metaText =
      task.task_type === 'frequency'
        ? `${task.current_count ?? 0} / ${task.frequency_target ?? 0} uses`
        : formatDaysRemaining(days_remaining, locale, taskType);
    const rowError = this._rowErrors[task.id];
    const justCompleted = this._justCompletedIds.includes(task.id);

    return html`
      <div class="task-row ${urgency} ${isSnoozed ? 'snoozed' : ''} ${justCompleted ? 'done-anim' : ''}">
        <div class="task-row-main">
          <div class="task-info">
            <ha-icon .icon=${task.icon || 'mdi:calendar-check'} style="color:${metaColor}"></ha-icon>
            <div>
              <div class="task-title">${task.title}</div>
              <div class="task-meta" style="color:${metaColor}">${metaText}</div>
            </div>
          </div>
          ${this._renderTaskActions(task, isSnoozed)}
        </div>
        ${rowError ? html`<div class="row-error">${rowError}</div>` : nothing}
      </div>
    `;
  }

  private _renderTaskActions(task: Task, isSnoozed: boolean) {
    const isCompleting = this._completingIds.includes(task.id);
    const justCompleted = this._justCompletedIds.includes(task.id);

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
        ${!isSnoozed
          ? html`
              <button
                class="btn btn-done"
                ?disabled=${isCompleting}
                @click=${() => this._completeTask(task)}
              >
                ${isCompleting ? '…' : 'Complete'}
              </button>
              ${task.task_type === 'frequency'
                ? html`
                    <button class="btn btn-secondary" @click=${() => this._incrementTask(task)}>+1</button>
                  `
                : nothing}
              <button class="btn btn-secondary" @click=${() => this._snoozeTask(task)}>Snooze</button>
            `
          : html`
              <button class="btn btn-done" @click=${() => this._enableTask(task)}>Enable</button>
            `}
        <button
          class="btn btn-icon"
          aria-label="Delete task"
          @click=${() => this._deleteTask(task)}
        >
          <ha-icon icon="mdi:delete"></ha-icon>
        </button>
      </div>
    `;
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

  private _deleteTask = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    this._clearRowError(task.id);
    try {
      await this._sendCommand({ type: 'upkeep/remove_task', task_id: task.id });
      this._refresh();
    } catch (e) {
      this._setRowError(task.id, (e as Error).message);
    }
  };

  static get styles() {
    return css`
      .panel {
        padding: 16px;
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .filter-bar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .filter-chip {
        padding: 6px 12px;
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
        color: var(--text-primary-color, #fff);
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
      .btn-done {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
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
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
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
      .add-form {
        background: var(--card-background-color);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid var(--divider-color);
      }
      .add-form h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }
      .form-row {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }
      .form-field-label {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .form-field-label input {
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
      .form-field-label input:focus {
        border-color: var(--primary-color);
      }
      .period-select-label {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .period-select-label select {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        padding: 0 12px;
        font-size: 14px;
      }
      .form-actions {
        margin-top: 12px;
      }
      .task-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .task-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
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
      .task-row.done-anim {
        animation: donePop 0.4s ease;
      }
      .task-row-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
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
        gap: 6px;
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
