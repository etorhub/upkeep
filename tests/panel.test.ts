import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import type { HomeAssistant } from 'custom-card-helpers';
import '../panel-src/main';
import { computePanelTaskStatus } from '../panel-src/task-status';

type MockTask = {
  id: string;
  title: string;
  task_type: string;
  interval_value: number;
  interval_type: string;
  enabled: boolean;
  entity_id?: string;
  last_performed?: string;
};

describe('computePanelTaskStatus', () => {
  it('returns snoozed for disabled tasks', () => {
    const status = computePanelTaskStatus({
      id: '1',
      title: 'Test',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: false,
    });
    expect(status.urgency).toBe('snoozed');
  });

  it('returns on_track for a recently completed task', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const status = computePanelTaskStatus({
      id: '1',
      title: 'Test',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
      last_performed: today.toISOString(),
    });
    expect(status.urgency).toBe('on_track');
    expect(status.days_remaining).toBeGreaterThan(80);
  });
});

describe('upkeep-panel add form', () => {
  it('renders period input as native select', async () => {
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async () => [],
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'add';
    await (el as any).updateComplete;

    const periodInput = el.shadowRoot?.querySelector('.task-form select');
    expect(periodInput).toBeInstanceOf(HTMLSelectElement);
  });

  it('loads tasks from unwrapped WebSocket result (Home Assistant behavior)', async () => {
    const existingTask: MockTask = {
      id: 'task-1',
      title: 'Change HVAC filter',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
    };
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async (msg: { type: string }) => {
          if (msg.type === 'upkeep/get_tasks') return [existingTask];
          return undefined;
        },
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    expect((el as any)._tasks).toEqual([existingTask]);

    const taskTitles = Array.from(el.shadowRoot!.querySelectorAll('.task-title')).map((node) =>
      node.textContent?.trim()
    );
    expect(taskTitles).toContain('Change HVAC filter');
    expect(el.shadowRoot?.querySelector('.empty')).toBeNull();
  });

  it('does not refresh tasks on hass updates while add form is open', async () => {
    const sendMessagePromise = vi.fn(async () => []);
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;
    const before = sendMessagePromise.mock.calls.length;

    (el as any)._formMode = 'add';
    (el as any).hass = { ...hass, states: { ...hass.states } };
    await (el as any).updateComplete;

    expect(sendMessagePromise.mock.calls.length).toBe(before);
  });

  it('keeps latest refresh result when submit races with older load', async () => {
    let getTasksCall = 0;
    let resolveStale: ((value: MockTask[]) => void) | undefined;
    let resolveFresh: ((value: MockTask[]) => void) | undefined;
    const stalePromise = new Promise<MockTask[]>((resolve) => {
      resolveStale = resolve;
    });
    const freshPromise = new Promise<MockTask[]>((resolve) => {
      resolveFresh = resolve;
    });

    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') {
        getTasksCall += 1;
        if (getTasksCall === 1) return Promise.resolve([]);
        if (getTasksCall === 2) return stalePromise;
        return freshPromise;
      }
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ success: true, id: 'new-task' });
      return Promise.resolve(undefined);
    });

    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._formMode = 'add';
    (el as any)._draftTitle = 'New Task';
    (el as any)._draftInterval = '30';
    (el as any)._draftPeriod = 'days';
    (el as any)._loadTasks({ silent: true });
    await (el as any)._submitAdd();

    resolveFresh?.([
      {
        id: 'new-task',
        title: 'New Task',
        task_type: 'interval',
        interval_value: 30,
        interval_type: 'days',
        enabled: true,
      },
    ]);
    await Promise.resolve();

    resolveStale?.([
      {
        id: 'old-task',
        title: 'Old Task',
        task_type: 'interval',
        interval_value: 90,
        interval_type: 'days',
        enabled: true,
      },
    ]);
    await Promise.resolve();

    expect((el as any)._tasks.map((task: { id: string }) => task.id)).toEqual(['new-task']);
  });

  it('submits add task command from tracked draft fields', async () => {
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') return Promise.resolve([]);
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ success: true, id: 'hvac' });
      return Promise.resolve(undefined);
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._formMode = 'add';
    (el as any)._draftTitle = 'HVAC Filter';
    (el as any)._draftDescription = 'Replace filter';
    (el as any)._draftIcon = 'mdi:air-filter';
    (el as any)._draftInterval = '60';
    (el as any)._draftPeriod = 'days';

    await (el as any)._submitAdd();

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upkeep/add_task',
        title: 'HVAC Filter',
        description: 'Replace filter',
        icon: 'mdi:air-filter',
        interval_value: 60,
        interval_type: 'days',
      })
    );
    expect((el as any)._formMode).toBe('none');
  });

  it('shows newly added task in the list after successful submit', async () => {
    const newTask = {
      id: 'hvac-filter',
      title: 'HVAC Filter',
      task_type: 'interval',
      interval_value: 60,
      interval_type: 'days',
      enabled: true,
    };
    let getTasksCall = 0;
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') {
        getTasksCall += 1;
        // First call (initial load): empty. Second call (after add): includes new task.
        return Promise.resolve(getTasksCall === 1 ? [] : [newTask]);
      }
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ success: true, id: newTask.id });
      return Promise.resolve(undefined);
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._formMode = 'add';
    (el as any)._draftTitle = 'HVAC Filter';
    (el as any)._draftInterval = '60';
    (el as any)._draftPeriod = 'days';

    await (el as any)._submitAdd();
    await (el as any).updateComplete;

    expect((el as any)._tasks).toEqual([newTask]);

    const taskTitles = Array.from(el.shadowRoot!.querySelectorAll('.task-title')).map((node) =>
      node.textContent?.trim()
    );
    expect(taskTitles).toContain('HVAC Filter');
  });

  it('shows empty state immediately rather than a blank area when task list is empty', async () => {
    // Simulate a slow get_tasks response — the empty state must be visible before it resolves.
    let resolveLoad: ((v: never[]) => void) | undefined;
    const pendingLoad = new Promise<never[]>((resolve) => {
      resolveLoad = resolve;
    });
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') return pendingLoad;
      return Promise.resolve(undefined);
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    // While the load is still in flight, empty state (not a blank) must be rendered.
    const emptyDiv = el.shadowRoot?.querySelector('.empty');
    expect(emptyDiv).not.toBeNull();

    // Resolve to confirm task list updates correctly afterwards.
    resolveLoad?.([]);
    await Promise.resolve();
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('.empty')).not.toBeNull();
  });

  it('submits update_task when saving edit form', async () => {
    const task = {
      id: 'task-1',
      title: 'HVAC Filter',
      description: 'Old desc',
      icon: 'mdi:calendar-check',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
    };
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') return Promise.resolve([task]);
      if (msg.type === 'upkeep/update_task') return Promise.resolve({ success: true });
      return Promise.resolve(undefined);
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._formMode = 'edit';
    (el as any)._editingTaskId = 'task-1';
    (el as any)._draftTitle = 'HVAC Filter Updated';
    (el as any)._draftDescription = 'New desc';
    (el as any)._draftIcon = 'mdi:air-filter';
    (el as any)._draftTaskType = 'time';
    (el as any)._draftInterval = '60';
    (el as any)._draftPeriod = 'weeks';

    await (el as any)._submitEdit();

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'upkeep/update_task',
      task_id: 'task-1',
      updates: {
        title: 'HVAC Filter Updated',
        description: 'New desc',
        icon: 'mdi:air-filter',
        interval_value: 60,
        interval_type: 'weeks',
      },
    });
    expect((el as any)._formMode).toBe('none');
    expect((el as any)._editingTaskId).toBeNull();
  });

  it('cancelForm clears edit mode', async () => {
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async () => [],
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'edit';
    (el as any)._editingTaskId = 'task-1';
    (el as any)._cancelForm();
    expect((el as any)._formMode).toBe('none');
    expect((el as any)._editingTaskId).toBeNull();
  });
});

describe('upkeep-panel task actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls complete_task service when entity_id is available', async () => {
    const task: MockTask = {
      id: 'task-1',
      entity_id: 'binary_sensor.filter',
      title: 'HVAC Filter',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
      last_performed: '2020-01-01T00:00:00',
    };
    const callService = vi.fn(async () => undefined);
    const sendMessagePromise = vi.fn(async (msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') return [task];
      return undefined;
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
      callService,
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    await (el as any)._completeTask(task);

    expect(callService).toHaveBeenCalledWith('upkeep', 'complete_task', {
      entity_id: 'binary_sensor.filter',
    });
    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'upkeep/complete_task' })
    );
  });

  it('falls back to WebSocket complete when entity_id is missing', async () => {
    const task: MockTask = {
      id: 'orphan-task',
      title: 'Orphan',
      task_type: 'time',
      interval_value: 30,
      interval_type: 'days',
      enabled: true,
    };
    const callService = vi.fn(async () => undefined);
    const sendMessagePromise = vi.fn(async (msg: { type: string; task_id?: string }) => {
      if (msg.type === 'upkeep/get_tasks') return [task];
      if (msg.type === 'upkeep/complete_task') return { success: true };
      return undefined;
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
      callService,
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    await (el as any)._completeTask(task);

    expect(callService).not.toHaveBeenCalled();
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'upkeep/complete_task',
      task_id: 'orphan-task',
    });
  });

  it('shows success checkmark after completing a task', async () => {
    const task: MockTask = {
      id: 'task-1',
      entity_id: 'binary_sensor.filter',
      title: 'HVAC Filter',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
      last_performed: '2020-01-01T00:00:00',
    };
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async (msg: { type: string }) => {
          if (msg.type === 'upkeep/get_tasks') return [task];
          return undefined;
        },
      },
      callService: async () => undefined,
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    await (el as any)._completeTask(task);
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('.done-check')).not.toBeNull();
    expect((el as any)._justCompletedIds).toContain('task-1');

    vi.advanceTimersByTime(1600);
    await (el as any).updateComplete;

    expect((el as any)._justCompletedIds).not.toContain('task-1');
  });

  it('filters tasks by computed urgency', async () => {
    const overdueTask: MockTask = {
      id: 'overdue',
      title: 'Overdue task',
      task_type: 'time',
      interval_value: 30,
      interval_type: 'days',
      enabled: true,
      last_performed: '2020-01-01T00:00:00',
    };
    const onTrackTask: MockTask = {
      id: 'on-track',
      title: 'On track task',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
      last_performed: new Date().toISOString(),
    };
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async (msg: { type: string }) => {
          if (msg.type === 'upkeep/get_tasks') return [overdueTask, onTrackTask];
          return undefined;
        },
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._filter = 'overdue';
    await (el as any).updateComplete;

    const titles = Array.from(el.shadowRoot!.querySelectorAll('.task-title')).map((node) =>
      node.textContent?.trim()
    );
    expect(titles).toEqual(['Overdue task']);
  });

  it('renders native action buttons instead of ha-button', async () => {
    const task: MockTask = {
      id: 'task-1',
      title: 'Test task',
      task_type: 'time',
      interval_value: 90,
      interval_type: 'days',
      enabled: true,
      last_performed: new Date().toISOString(),
    };
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async (msg: { type: string }) => {
          if (msg.type === 'upkeep/get_tasks') return [task];
          return undefined;
        },
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('ha-button')).toBeNull();
    expect(el.shadowRoot?.querySelector('.btn-done')?.textContent?.trim()).toBe('Complete');
    const secondaryButtons = Array.from(el.shadowRoot!.querySelectorAll('.btn-secondary')).map(
      (node) => node.textContent?.trim()
    );
    expect(secondaryButtons).toContain('Edit');
    expect(secondaryButtons).toContain('Snooze');
  });
});
