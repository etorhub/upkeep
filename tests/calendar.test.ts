import { beforeAll, describe, expect, it } from 'vitest';
import { calendarDaysBetween, loadCalendar } from '../src/calendar';
import { computePanelTaskStatus, scheduledDueDate } from '../panel-src/task-status';
import { buildTaskData } from '../src/utils';

beforeAll(async () => {
  await loadCalendar();
});

function entity(attributes: Record<string, unknown>) {
  return {
    entity_id: 'binary_sensor.task',
    state: 'off',
    attributes: {
      friendly_name: 'Filter',
      icon: 'mdi:calendar-check',
      task_type: 'time',
      ...attributes,
    },
  } as never;
}

describe('calendar intervals', () => {
  it('clamps a month added to 31 January onto the last day of February', () => {
    const leap = scheduledDueDate(new Date(2024, 0, 31), 1, 'months');
    expect(leap.getFullYear()).toBe(2024);
    expect(leap.getMonth()).toBe(1);
    expect(leap.getDate()).toBe(29);

    const common = scheduledDueDate(new Date(2023, 0, 31), 1, 'months');
    expect(common.getFullYear()).toBe(2023);
    expect(common.getMonth()).toBe(1);
    expect(common.getDate()).toBe(28);
  });

  it('counts a 23-hour daylight-saving midnight as one day', () => {
    const start = new Date('2026-03-08T05:00:00Z');
    const end = new Date('2026-03-09T04:00:00Z');
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(Math.floor((end.getTime() - start.getTime()) / 86400000)).toBe(0);
    expect(calendarDaysBetween(start, end, 'America/New_York')).toBe(1);

    const status = computePanelTaskStatus(
      {
        id: 'dst',
        title: 'DST',
        task_type: 'time',
        interval_value: 1,
        interval_type: 'days',
        enabled: true,
        last_performed: '2026-03-08T05:00:00Z',
      },
      7,
      start,
      'America/New_York'
    );
    expect(status.days_remaining).toBe(1);
    expect(status.urgency).toBe('due_soon');
  });

  it('keeps a published schema 2 day count and fixes the legacy 25-hour count', () => {
    const now = new Date('2026-11-01T04:00:00Z');
    const published = buildTaskData(
      entity({
        upkeep_schema: 2,
        trigger_type: 'interval',
        urgency: 'on_track',
        progress: 10,
        days_remaining: 12,
        status_key: 'status.days_left',
        next_due: '2026-11-02T05:00:00Z',
      }),
      7,
      now,
      'America/New_York'
    );
    expect(published.days_remaining).toBe(12);

    const legacy = buildTaskData(
      entity({
        last_performed: '2026-10-01T04:00:00Z',
        next_due: '2026-11-02T05:00:00Z',
      }),
      7,
      now,
      'America/New_York'
    );
    expect(legacy.days_remaining).toBe(1);
    expect(Math.ceil((new Date('2026-11-02T05:00:00Z').getTime() - now.getTime()) / 86400000)).toBe(
      2
    );
  });
});
