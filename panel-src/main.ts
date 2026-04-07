import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';

export interface Task {
  id: string;
  entity_id?: string | null;
  title: string;
  description?: string;
  task_type: string;
  interval_value: number;
  interval_type: string;
  last_performed?: string;
  frequency_target?: number;
  current_count?: number;
  watched_entity?: string;
  assigned_user?: string;
  icon?: string;
  tag_id?: string;
  enabled: boolean;
  snoozed_until?: string;
  notify_when_due?: boolean;
}

@customElement('upkeep-panel')
export class UpkeepPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow = false;

  @state() private _tasks: Task[] = [];
  @state() private _loading = true;
  @state() private _error: string | null = null;
  @state() private _showAddForm = false;
  @state() private _filter: 'all' | 'overdue' | 'due_soon' | 'on_track' | 'snoozed' = 'all';
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

  private _loadTasks(options?: { silent?: boolean }): void {
    if (!this.hass?.connection) return;
    const shouldShowLoading = !options?.silent;
    if (shouldShowLoading) {
      this._loading = true;
    }
    const requestId = ++this._loadRequestId;
    this.hass.connection
      .sendMessagePromise({ type: 'upkeep/get_tasks' })
      .then((msg: unknown) => {
        if (requestId !== this._loadRequestId) return;
        const m = msg as { result?: Task[] };
        this._tasks = m.result ?? [];
        if (shouldShowLoading) {
          this._loading = false;
        }
        this._error = null;
      })
      .catch((err: Error) => {
        if (requestId !== this._loadRequestId) return;
        if (shouldShowLoading) {
          this._loading = false;
        }
        this._error = err?.message ?? 'Failed to load tasks';
      });
  }

  private async _sendCommand<T>(msg: { type: string; [key: string]: unknown }): Promise<T> {
    return this.hass.connection.sendMessagePromise(msg) as Promise<T>;
  }

  private _refresh(): void {
    // Keep the current list rendered during refresh to avoid layout shifts.
    this._loadTasks({ silent: true });
  }

  private _getTaskEntityId(task: Task): string | null {
    return task.entity_id ?? null;
  }

  private _filteredTasks(): Task[] {
    const entities = this.hass.states;
    return this._tasks.filter((task) => {
      if (this._filter === 'snoozed') return !task.enabled;
      const eid = this._getTaskEntityId(task);
      if (!eid) return true;
      const state = entities[eid];
      if (!state?.attributes) return true;
      const urgency = state.attributes.urgency;
      if (this._filter === 'all') return true;
      if (this._filter === 'overdue') return urgency === 'overdue';
      if (this._filter === 'due_soon') return urgency === 'due_soon';
      if (this._filter === 'on_track') return urgency === 'on_track';
      return true;
    });
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
                    @click=${() => { this._filter = f; }}
                  >
                    ${f.replace('_', ' ')}
                  </button>
                `
              )}
            </div>
            <ha-button @click=${() => { this._showAddForm = !this._showAddForm; }}>
              ${this._showAddForm ? 'Cancel' : 'Add Task'}
            </ha-button>
          </div>
        </div>

        ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
        ${this._loading ? html`<div class="loading">Loading tasks...</div>` : nothing}

        ${this._showAddForm ? this._renderAddForm() : nothing}

        <div class="task-list">
          ${tasks.length === 0 && !this._loading
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
          <ha-textfield label="Title" id="add-title" .value=${''}></ha-textfield>
        </div>
        <div class="form-row">
          <ha-textfield label="Interval (e.g. 90)" type="number" id="add-interval" .value=${'90'}></ha-textfield>
          <label class="period-select-label">
            <span>Period</span>
            <select id="add-period">
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <ha-textfield label="Description (optional)" id="add-desc"></ha-textfield>
        </div>
        <div class="form-actions">
          <ha-button @click=${this._submitAdd}>Add Task</ha-button>
        </div>
      </div>
    `;
  }

  private _submitAdd = async () => {
    const titleEl = this.shadowRoot?.getElementById('add-title') as HTMLInputElement;
    const intervalEl = this.shadowRoot?.getElementById('add-interval') as HTMLInputElement;
    const periodEl = this.shadowRoot?.getElementById('add-period') as HTMLSelectElement;
    const title = titleEl?.value?.trim();
    if (!title) return;
    const interval = parseInt(intervalEl?.value ?? '90', 10) || 90;
    const interval_type = periodEl?.value ?? 'days';
    try {
      await this._sendCommand({
        type: 'upkeep/add_task',
        title,
        interval_value: interval,
        interval_type,
      });
      this._showAddForm = false;
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _renderTask(task: Task) {
    const eid = this._getTaskEntityId(task);
    const state = eid ? this.hass.states[eid] : null;
    const urgency = state?.attributes?.urgency ?? 'on_track';
    const daysRemaining = state?.attributes?.days_remaining ?? 0;
    const isSnoozed = !task.enabled;

    return html`
      <div class="task-row ${urgency} ${isSnoozed ? 'snoozed' : ''}">
        <div class="task-info">
          <ha-icon .icon=${task.icon || 'mdi:calendar-check'}></ha-icon>
          <div>
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
              ${task.task_type === 'frequency'
                ? html`${task.current_count ?? 0} / ${task.frequency_target ?? 0} uses`
                : html`${urgency} · ${daysRemaining} days left`}
            </div>
          </div>
        </div>
        <div class="task-actions">
          ${!isSnoozed
            ? html`
                <ha-button @click=${() => this._completeTask(task)}>Complete</ha-button>
                ${task.task_type === 'frequency'
                  ? html`<ha-button @click=${() => this._incrementTask(task)}>+1</ha-button>`
                  : nothing}
                <ha-button @click=${() => this._snoozeTask(task)}>Snooze</ha-button>
              `
            : html`<ha-button @click=${() => this._enableTask(task)}>Enable</ha-button>`}
          <ha-icon-button @click=${() => this._deleteTask(task)}>
            <ha-icon icon="mdi:delete"></ha-icon>
          </ha-icon-button>
        </div>
      </div>
    `;
  }

  private _incrementTask = async (task: Task) => {
    try {
      await this._sendCommand({ type: 'upkeep/increment_counter', task_id: task.id });
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _completeTask = async (task: Task) => {
    try {
      await this._sendCommand({ type: 'upkeep/complete_task', task_id: task.id });
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _snoozeTask = async (task: Task) => {
    try {
      await this._sendCommand({
        type: 'upkeep/snooze_task',
        task_id: task.id,
        disable: true,
      });
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _enableTask = async (task: Task) => {
    try {
      await this._sendCommand({ type: 'upkeep/enable_task', task_id: task.id });
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
    }
  };

  private _deleteTask = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await this._sendCommand({ type: 'upkeep/remove_task', task_id: task.id });
      this._refresh();
    } catch (e) {
      this._error = (e as Error).message;
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
      }
      .filter-chip.active {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border-color: var(--primary-color);
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
      .form-row ha-textfield,
      .form-row ha-select {
        flex: 1;
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
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--card-background-color);
        border-radius: 12px;
        border: 1px solid var(--divider-color);
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
      .task-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .task-info ha-icon {
        --mdc-icon-size: 24px;
      }
      .task-title {
        font-weight: 500;
        font-size: 14px;
      }
      .task-meta {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .task-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .error {
        color: var(--error-color);
        padding: 12px;
        margin-bottom: 12px;
      }
      .loading {
        padding: 12px;
        color: var(--secondary-text-color);
      }
      .empty {
        padding: 32px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    `;
  }
}
