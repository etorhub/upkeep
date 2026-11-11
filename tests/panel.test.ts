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
  it('translates the header when Home Assistant language is Catalan', async () => {
    const hass = {
      language: 'ca',
      locale: { language: 'ca' },
      states: {},
      connection: {
        sendMessagePromise: async () => [],
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('.btn-header')?.textContent?.trim()).toBe('Nova tasca');
    expect(
      Array.from(el.shadowRoot!.querySelectorAll('.filter-chip')).map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(['Totes 0', 'Vençudes 0', 'Properes 0', 'Al dia 0', 'Desconegudes 0', 'Ajornades 0']);
  });

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

    const periodInput = el.shadowRoot?.querySelector('.task-form input[name="period"]');
    expect(periodInput).toBeInstanceOf(HTMLInputElement);
    expect((periodInput as HTMLInputElement).type).toBe('radio');
    expect(el.shadowRoot?.querySelector('label[for="task-interval"]')?.textContent).toContain(
      'Every'
    );
  });

  it('keeps Add Task in the header only while the form is closed', async () => {
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async () => [],
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    const headerButton = el.shadowRoot?.querySelector('.btn-header');
    expect(headerButton?.textContent?.trim()).toBe('New task');
    expect(
      Array.from(el.shadowRoot!.querySelectorAll('.filter-chip')).map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(['All 0', 'Overdue 0', 'Due soon 0', 'On track 0', 'Unknown 0', 'Snoozed 0']);

    (el as any)._formMode = 'add';
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('.btn-header')).not.toBeNull();
    const formButtons = Array.from(el.shadowRoot!.querySelectorAll('.task-form button'))
      .map((node) => node.textContent?.trim())
      .filter(Boolean);
    expect(formButtons).toEqual(['Time interval', 'Cancel', 'Add Task']);
  });

  it('disables submit until the title is filled', async () => {
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async () => [],
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'add';
    await (el as any).updateComplete;

    const submit = () =>
      el.shadowRoot?.querySelector('.task-form button.btn-done') as HTMLButtonElement;
    expect(submit().disabled).toBe(true);

    (el as any)._draftTitle = 'Change air filter';
    await (el as any).updateComplete;
    expect(submit().disabled).toBe(false);
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
        notify_before: false,
        notify_when_due: false,
      },
    });
    expect((el as any)._formMode).toBe('none');
    expect((el as any)._editingTaskId).toBeNull();
  });

  it('shows the lead period only after the coming-up checkbox, and the service for either notice', async () => {
    const hass = {
      states: {},
      services: {
        notify: {
          persistent_notification: { name: 'Persistent notification' },
          mobile_app_pixel_8: { name: 'Mobile App Pixel 8' },
          send_message: { name: 'Send Message' },
        },
      },
      connection: { sendMessagePromise: async () => [] },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'add';
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('#task-notify-unit')).toBeNull();
    expect(el.shadowRoot?.querySelector('#task-notify-service')).toBeNull();

    (el as any)._draftNotifyBefore = true;
    (el as any)._draftNotifyService = 'persistent_notification';
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('#task-notify-unit')).toBeInstanceOf(HTMLSelectElement);
    const service = el.shadowRoot?.querySelector('#task-notify-service') as HTMLSelectElement;
    expect(service).toBeInstanceOf(HTMLSelectElement);
    expect(Array.from(service.options).map((option) => option.value)).toEqual([
      'mobile_app_pixel_8',
      'persistent_notification',
    ]);

    (el as any)._draftNotifyBefore = false;
    (el as any)._draftNotifyWhenDue = true;
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('#task-notify-unit')).toBeNull();
    expect(el.shadowRoot?.querySelector('#task-notify-service')).toBeInstanceOf(HTMLSelectElement);
  });

  it('omits unused notice fields when saving a task', async () => {
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ success: true, id: 'dish' });
      return Promise.resolve([]);
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'add';
    (el as any)._draftTitle = 'Netejar rentaplats';
    (el as any)._draftNotifyBefore = false;
    (el as any)._draftNotifyBeforeValue = '7';
    (el as any)._draftNotifyBeforeUnit = 'days';
    (el as any)._draftNotifyWhenDue = true;
    (el as any)._draftNotifyService = '';

    await (el as any)._submitAdd();

    const payload = sendMessagePromise.mock.calls.find(
      (call) => call[0]?.type === 'upkeep/add_task'
    )?.[0];
    expect(payload).toMatchObject({
      notify_before: false,
      notify_when_due: true,
    });
    expect(payload).not.toHaveProperty('notify_before_value');
    expect(payload).not.toHaveProperty('notify_before_unit');
    expect(payload).not.toHaveProperty('notify_service');
  });

  it('submits the selected notice settings with a new task', async () => {
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') return Promise.resolve([]);
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ success: true, id: 'hvac' });
      return Promise.resolve(undefined);
    });
    const hass = {
      states: {},
      services: {
        notify: {
          mobile_app_pixel_8: { name: 'Mobile App Pixel 8' },
        },
      },
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._formMode = 'add';
    (el as any)._draftTitle = 'HVAC Filter';
    (el as any)._draftNotifyBefore = true;
    (el as any)._draftNotifyBeforeValue = '2';
    (el as any)._draftNotifyBeforeUnit = 'weeks';
    (el as any)._draftNotifyWhenDue = true;
    (el as any)._draftNotifyService = 'mobile_app_pixel_8';

    await (el as any)._submitAdd();

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upkeep/add_task',
        notify_before: true,
        notify_before_value: 2,
        notify_before_unit: 'weeks',
        notify_when_due: true,
        notify_service: 'mobile_app_pixel_8',
      })
    );
  });

  it('submits notice settings when saving an edit', async () => {
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/update_task') return Promise.resolve({ success: true });
      return Promise.resolve(undefined);
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'edit';
    (el as any)._editingTaskId = 'task-1';
    (el as any)._draftTitle = 'HVAC Filter';
    (el as any)._draftTaskType = 'time';
    (el as any)._draftNotifyBefore = true;
    (el as any)._draftNotifyBeforeValue = '3';
    (el as any)._draftNotifyBeforeUnit = 'days';
    (el as any)._draftNotifyWhenDue = false;
    (el as any)._draftNotifyService = 'persistent_notification';

    await (el as any)._submitEdit();

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upkeep/update_task',
        task_id: 'task-1',
        updates: expect.objectContaining({
          notify_before: true,
          notify_before_value: 3,
          notify_before_unit: 'days',
          notify_when_due: false,
          notify_service: 'persistent_notification',
        }),
      })
    );
  });

  it('hides the lead period when editing a frequency task', async () => {
    const hass = {
      states: {},
      connection: { sendMessagePromise: async () => [] },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._formMode = 'edit';
    (el as any)._draftTaskType = 'frequency';
    (el as any)._draftNotifyBefore = true;
    (el as any)._draftNotifyWhenDue = true;
    (el as any)._draftNotifyService = 'persistent_notification';
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('#task-notify-before')).toBeNull();
    expect(el.shadowRoot?.querySelector('#task-notify-unit')).toBeNull();
    expect(el.shadowRoot?.querySelector('#task-notify-due')).toBeInstanceOf(HTMLInputElement);
    expect(el.shadowRoot?.querySelector('#task-notify-service')).toBeInstanceOf(HTMLSelectElement);
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
    expect(el.shadowRoot?.querySelector('.btn-complete.quiet')?.textContent?.trim()).toBe(
      'Complete'
    );
    expect(el.shadowRoot?.querySelector('.btn-danger')).toBeNull();

    (el as any)._openMenuId = 'task-1';
    await (el as any).updateComplete;
    const menuItems = Array.from(el.shadowRoot!.querySelectorAll('.row-menu button')).map((node) =>
      node.textContent?.trim()
    );
    expect(menuItems).toContain('Edit');
    expect(menuItems).toContain('Snooze');
    expect(menuItems).not.toContain('Delete task');
  });

  it('uses a bottom sheet and a floating add button when narrow', async () => {
    const task: MockTask = {
      id: 'task-1',
      title: 'Test task',
      task_type: 'time',
      interval_value: 30,
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

    const el = await fixture<HTMLElement>(
      html`<upkeep-panel .hass=${hass} .narrow=${true}></upkeep-panel>`
    );
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('.fab')?.textContent).toContain('New task');
    expect(el.shadowRoot?.querySelector('.btn-check')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.row-menu')).toBeNull();

    (el as any)._openMenuId = 'task-1';
    await (el as any).updateComplete;
    const sheet = Array.from(el.shadowRoot!.querySelectorAll('.sheet-action')).map((node) =>
      node.textContent?.trim()
    );
    expect(sheet).toContain('Snooze');
    expect(sheet).toContain('Edit');
    expect(sheet).toContain('Delete');
  });

  it('shows the published status and keeps Done disabled while watching', async () => {
    const task: MockTask = {
      id: 'kettle',
      title: 'Descale kettle',
      task_type: 'usage',
      interval_value: 0,
      interval_type: 'days',
      enabled: true,
      entity_id: 'binary_sensor.descale_kettle',
    };
    const hass = {
      states: {
        'binary_sensor.descale_kettle': {
          entity_id: 'binary_sensor.descale_kettle',
          state: 'off',
          attributes: {
            urgency: 'on_track',
            progress: 0,
            status_key: 'status.watching',
            rule_key: 'rule.usage',
            rule_vars: { threshold: 100, unit: 'L', entity_id: 'sensor.kettle' },
            done_enabled: false,
          },
        },
      },
      connection: {
        sendMessagePromise: async (msg: { type: string }) => {
          if (msg.type === 'upkeep/get_tasks') return [task];
          return undefined;
        },
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector('.task-meta')?.textContent?.trim()).toBe('Watching');
    expect(el.shadowRoot?.querySelector('.task-schedule')?.textContent).toContain('sensor.kettle');
    const done = el.shadowRoot?.querySelector('.btn-complete') as HTMLButtonElement;
    expect(done.disabled).toBe(true);
  });
});
