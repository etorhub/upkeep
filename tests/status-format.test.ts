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
});
