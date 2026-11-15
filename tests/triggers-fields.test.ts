import { describe, expect, it } from 'vitest';
import { validateDraft } from '../panel-src/triggers/fields';

describe('calendar draft validation', () => {
  it('accepts yearly and monthly month_day rules', () => {
    expect(
      validateDraft(
        { type: 'calendar', rule: 'month_day', repeat: 'year', month: 12, day: 25 },
        null
      )
    ).toBeNull();
    expect(
      validateDraft({ type: 'calendar', rule: 'month_day', repeat: 'month', day: 1 }, null)
    ).toBeNull();
  });

  it('rejects calendar drafts without a known rule', () => {
    expect(validateDraft({ type: 'calendar', repeat: 'year', month: 12, day: 25 }, null)).toBe(
      'trigger.errors.calendar'
    );
  });
});
