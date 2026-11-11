import { describe, it, expect } from 'vitest';
import { safeCustomElement } from '../src/define';

describe('safeCustomElement', () => {
  it('does not throw when a tag is registered twice', () => {
    class A extends HTMLElement {}
    class B extends HTMLElement {}
    expect(() => {
      safeCustomElement('upkeep-test-el')(A);
      safeCustomElement('upkeep-test-el')(B);
    }).not.toThrow();
    expect(customElements.get('upkeep-test-el')).toBe(A);
  });

  it('registers components under the upkeep- prefix', async () => {
    await import('../src/components/progress-ring');
    await import('../src/components/task-tile');
    await import('../src/components/summary-header');
    for (const tag of ['upkeep-progress-ring', 'upkeep-task-tile', 'upkeep-summary-header']) {
      expect(customElements.get(tag)).toBeDefined();
    }
  });
});
