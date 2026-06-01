import { describe, it, expect } from 'vitest';
import { localize } from '../src/localize/localize';

describe('localize', () => {
  it('uses the language parameter for lookups', () => {
    expect(localize('card.overdue', undefined, undefined, 'nl')).toBe('Verlopen');
    expect(localize('editor.all', undefined, undefined, 'nl')).toBe('Alle');
    expect(localize('editor.snoozed', undefined, undefined, 'nl')).toBe('Uitgesteld');
  });

  it('falls back to base language tag for regional locales', () => {
    expect(localize('card.on_track', undefined, undefined, 'nl-NL')).toBe('Op schema');
  });

  it('falls back to English for unknown languages', () => {
    expect(localize('card.overdue', undefined, undefined, 'xx')).toBe('Overdue');
  });
});
