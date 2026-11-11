import { describe, expect, it } from 'vitest';
import { formatPart } from '../src/status-format';

describe('formatPart', () => {
  it('picks the plural and the entity name', () => {
    const phrase = formatPart({ key: 'status.days_left', vars: { count: 1 } }, 'en', {
      states: { 'sensor.kettle': { attributes: { friendly_name: 'Kettle' } } },
    });
    const named = formatPart(
      { key: 'rule.cycle', vars: { count: 30, entity_id: 'sensor.kettle' } },
      'en',
      { states: { 'sensor.kettle': { attributes: { friendly_name: 'Kettle' } } } }
    );

    expect(phrase).toBe('1 day left');
    expect(named).toBe('Every 30 runs of Kettle');
  });

  it('fills the current count in progress phrases', () => {
    expect(formatPart({ key: 'status.count_of', vars: { current: 3, target: 10 } }, 'en')).toBe(
      '3 of 10'
    );
    expect(
      formatPart({ key: 'status.usage_of', vars: { current: 6.5, limit: 10, unit: 'kWh' } }, 'en')
    ).toBe('6.5 of 10 kWh');
    expect(
      formatPart(
        { key: 'status.after_count', vars: { current: 1, target: 4, task_id: 'lint-trap' } },
        'en'
      )
    ).toBe('1 of 4');
  });
});
