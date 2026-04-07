import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import type { HomeAssistant } from 'custom-card-helpers';
import '../panel-src/main';

describe('upkeep-panel add form', () => {
  it('renders period input as native select', async () => {
    const hass = {
      states: {},
      connection: {
        sendMessagePromise: async () => ({ result: [] }),
      },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    (el as any)._showAddForm = true;
    await (el as any).updateComplete;

    const periodInput = el.shadowRoot?.querySelector('#add-period');
    expect(periodInput).toBeInstanceOf(HTMLSelectElement);
  });

  it('does not refresh tasks on hass updates while add form is open', async () => {
    const sendMessagePromise = vi.fn(async () => ({ result: [] }));
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;
    const before = sendMessagePromise.mock.calls.length;

    (el as any)._showAddForm = true;
    (el as any).hass = { ...hass, states: { ...hass.states } };
    await (el as any).updateComplete;

    expect(sendMessagePromise.mock.calls.length).toBe(before);
  });

  it('keeps latest refresh result when submit races with older load', async () => {
    let getTasksCall = 0;
    let resolveStale:
      | ((value: {
          result: Array<{
            id: string;
            title: string;
            task_type: string;
            interval_value: number;
            interval_type: string;
            enabled: boolean;
          }>;
        }) => void)
      | undefined;
    let resolveFresh:
      | ((value: {
          result: Array<{
            id: string;
            title: string;
            task_type: string;
            interval_value: number;
            interval_type: string;
            enabled: boolean;
          }>;
        }) => void)
      | undefined;
    const stalePromise = new Promise<{
      result: Array<{
        id: string;
        title: string;
        task_type: string;
        interval_value: number;
        interval_type: string;
        enabled: boolean;
      }>;
    }>((resolve) => {
      resolveStale = resolve;
    });
    const freshPromise = new Promise<{
      result: Array<{
        id: string;
        title: string;
        task_type: string;
        interval_value: number;
        interval_type: string;
        enabled: boolean;
      }>;
    }>((resolve) => {
      resolveFresh = resolve;
    });

    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') {
        getTasksCall += 1;
        if (getTasksCall === 1) return Promise.resolve({ result: [] });
        if (getTasksCall === 2) return stalePromise;
        return freshPromise;
      }
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ result: true });
      return Promise.resolve({ result: [] });
    });

    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._showAddForm = true;
    (el as any)._draftTitle = 'New Task';
    (el as any)._draftInterval = '30';
    (el as any)._draftPeriod = 'days';
    (el as any)._loadTasks({ silent: true });
    await (el as any)._submitAdd();

    resolveFresh?.({
      result: [
        {
          id: 'new-task',
          title: 'New Task',
          task_type: 'interval',
          interval_value: 30,
          interval_type: 'days',
          enabled: true,
        },
      ],
    });
    await Promise.resolve();

    resolveStale?.({
      result: [
        {
          id: 'old-task',
          title: 'Old Task',
          task_type: 'interval',
          interval_value: 90,
          interval_type: 'days',
          enabled: true,
        },
      ],
    });
    await Promise.resolve();

    expect((el as any)._tasks.map((task: { id: string }) => task.id)).toEqual(['new-task']);
  });

  it('submits add task command from tracked draft fields', async () => {
    const sendMessagePromise = vi.fn((msg: { type: string }) => {
      if (msg.type === 'upkeep/get_tasks') return Promise.resolve({ result: [] });
      if (msg.type === 'upkeep/add_task') return Promise.resolve({ result: { success: true } });
      return Promise.resolve({ result: [] });
    });
    const hass = {
      states: {},
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant;

    const el = await fixture<HTMLElement>(html`<upkeep-panel .hass=${hass}></upkeep-panel>`);
    await (el as any).updateComplete;

    (el as any)._showAddForm = true;
    (el as any)._draftTitle = 'HVAC Filter';
    (el as any)._draftDescription = 'Replace filter';
    (el as any)._draftInterval = '60';
    (el as any)._draftPeriod = 'days';

    await (el as any)._submitAdd();

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upkeep/add_task',
        title: 'HVAC Filter',
        description: 'Replace filter',
        interval_value: 60,
        interval_type: 'days',
      })
    );
    expect((el as any)._showAddForm).toBe(false);
  });
});
