import { describe, it, expect } from 'vitest';
import { localize } from '../src/localize/localize';

describe('localize', () => {
  it('uses the language parameter for lookups', () => {
    expect(localize('card.overdue', undefined, 'nl')).toBe('Verlopen');
    expect(localize('editor.all', undefined, 'nl')).toBe('Alle');
    expect(localize('editor.snoozed', undefined, 'nl')).toBe('Uitgesteld');
  });

  it('falls back to base language tag for regional locales', () => {
    expect(localize('card.on_track', undefined, 'nl-NL')).toBe('Op schema');
  });

  it('falls back to English for unknown languages', () => {
    expect(localize('card.overdue', undefined, 'xx')).toBe('Overdue');
  });

  it('substitutes named placeholders', () => {
    expect(localize('panel.delete_confirm', { title: 'Filter' }, 'en')).toBe('Delete "Filter"?');
    expect(localize('panel.uses_progress', { current: 3, target: 10 }, 'ca')).toBe('3 / 10 usos');
  });
});
