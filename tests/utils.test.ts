import { describe, it, expect } from 'vitest';
import {
  isMaintenanceEntity,
  discoverEntities,
  buildTaskData,
  sortTasks,
  filterTasks,
  getUrgencyColor,
  formatDaysRemaining,
} from '../src/utils';

function mockHassEntity(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const defaultAttributes = {
    friendly_name: 'Test Task',
    icon: 'mdi:calendar-check',
    last_performed: '2025-01-01T00:00:00',
    next_due: '2025-04-01T00:00:00',
    interval_value: 90,
    interval_type: 'days',
  };
  const { attributes: attrOverrides, ...rest } = overrides;
  return {
    entity_id: 'binary_sensor.test_task',
    state: 'off',
    attributes: { ...defaultAttributes, ...(attrOverrides as object) },
    ...rest,
  };
}

function mockHass(states: Record<string, Record<string, unknown>>) {
  return { states };
}

describe('isMaintenanceEntity', () => {
  it('returns true for binary_sensor with maintenance attributes', () => {
    expect(isMaintenanceEntity(mockHassEntity() as any)).toBe(true);
  });

  it('returns false for non-binary_sensor', () => {
    expect(isMaintenanceEntity(mockHassEntity({ entity_id: 'sensor.other' }) as any)).toBe(false);
  });

  it('returns false when missing last_performed', () => {
    const e = mockHassEntity() as any;
    delete e.attributes.last_performed;
    expect(isMaintenanceEntity(e)).toBe(false);
  });
});

describe('discoverEntities', () => {
  it('auto-discovers maintenance entities', () => {
    const hass = mockHass({
      'binary_sensor.task1': mockHassEntity({ entity_id: 'binary_sensor.task1' }),
      'binary_sensor.task2': mockHassEntity({ entity_id: 'binary_sensor.task2' }),
      'sensor.other': { entity_id: 'sensor.other', attributes: {} },
    }) as any;
    const ids = discoverEntities(hass);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('binary_sensor.task1');
    expect(ids).toContain('binary_sensor.task2');
  });

  it('returns manual entities when provided', () => {
    const hass = mockHass({
      'binary_sensor.task1': mockHassEntity({ entity_id: 'binary_sensor.task1' }),
    }) as any;
    const ids = discoverEntities(hass, ['binary_sensor.task1']);
    expect(ids).toEqual(['binary_sensor.task1']);
  });

  it('excludes entities when exclude_entities provided', () => {
    const hass = mockHass({
      'binary_sensor.task1': mockHassEntity({ entity_id: 'binary_sensor.task1' }),
      'binary_sensor.task2': mockHassEntity({ entity_id: 'binary_sensor.task2' }),
    }) as any;
    const ids = discoverEntities(hass, undefined, ['binary_sensor.task2']);
    expect(ids).toEqual(['binary_sensor.task1']);
  });
});

describe('buildTaskData', () => {
  const now = new Date('2025-02-15T12:00:00Z');

  it('returns correct urgency for overdue task', () => {
    const e = mockHassEntity({
      attributes: {
        last_performed: '2024-01-01T00:00:00Z',
        next_due: '2025-01-01T00:00:00Z',
      },
    }) as any;
    const task = buildTaskData(e, 7, now);
    expect(task.progress).toBeGreaterThanOrEqual(100);
    expect(task.days_remaining).toBeLessThanOrEqual(0);
    expect(task.urgency).toBe('overdue');
  });

  it('returns correct urgency for due soon task', () => {
    const e = mockHassEntity({
      attributes: {
        last_performed: '2025-01-01T00:00:00Z',
        next_due: '2025-02-20T00:00:00Z',
      },
    }) as any;
    const task = buildTaskData(e, 7, now);
    expect(task.progress).toBeLessThan(100);
    expect(task.days_remaining).toBeGreaterThan(0);
    expect(task.days_remaining).toBeLessThanOrEqual(7);
    expect(task.urgency).toBe('due_soon');
  });

  it('returns correct urgency for on track task', () => {
    const e = mockHassEntity({
      attributes: {
        last_performed: '2025-01-01T00:00:00Z',
        next_due: '2025-04-01T00:00:00Z',
      },
    }) as any;
    const task = buildTaskData(e, 7, now);
    expect(task.urgency).toBe('on_track');
  });
});

describe('sortTasks', () => {
  const tasks = [
    { progress: 50, name: 'B', next_due: new Date('2025-03-01') } as any,
    { progress: 100, name: 'A', next_due: new Date('2025-01-01') } as any,
    { progress: 10, name: 'C', next_due: new Date('2025-03-15') } as any,
  ];

  it('sorts by urgency (progress desc)', () => {
    const sorted = sortTasks(tasks, 'urgency');
    expect(sorted[0].progress).toBe(100);
    expect(sorted[2].progress).toBe(10);
  });

  it('sorts by name', () => {
    const sorted = sortTasks(tasks, 'name');
    expect(sorted[0].name).toBe('A');
    expect(sorted[2].name).toBe('C');
  });

  it('sorts by due_date', () => {
    const sorted = sortTasks(tasks, 'due_date');
    expect(sorted[0].next_due.getTime()).toBeLessThan(sorted[2].next_due.getTime());
  });
});

describe('filterTasks', () => {
  const tasks = [
    { urgency: 'overdue' } as any,
    { urgency: 'due_soon' } as any,
    { urgency: 'on_track' } as any,
  ];

  it('returns all when filter is all', () => {
    expect(filterTasks(tasks, 'all')).toHaveLength(3);
  });

  it('filters by urgency', () => {
    expect(filterTasks(tasks, 'overdue')).toHaveLength(1);
    expect(filterTasks(tasks, 'due_soon')).toHaveLength(1);
    expect(filterTasks(tasks, 'on_track')).toHaveLength(1);
  });
});

describe('getUrgencyColor', () => {
  it('returns correct colors for each urgency', () => {
    expect(getUrgencyColor('overdue')).toContain('error');
    expect(getUrgencyColor('due_soon')).toContain('warning');
    expect(getUrgencyColor('on_track')).toContain('success');
  });
});

describe('formatDaysRemaining', () => {
  it('formats overdue days in English', () => {
    expect(formatDaysRemaining(-3, 'en')).toContain('3');
    expect(formatDaysRemaining(-3, 'en')).toContain('overdue');
  });

  it('formats remaining days in English', () => {
    expect(formatDaysRemaining(5, 'en')).toContain('5');
    expect(formatDaysRemaining(5, 'en')).toContain('left');
  });

  it('formats today in English', () => {
    expect(formatDaysRemaining(0, 'en')).toBe('Today');
  });

  it('formats in Spanish', () => {
    expect(formatDaysRemaining(1, 'es')).toContain('1');
  });

  it('formats in Catalan', () => {
    expect(formatDaysRemaining(1, 'ca')).toContain('1');
  });
});
