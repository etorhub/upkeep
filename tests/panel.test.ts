import { describe, it, expect } from 'vitest';
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
});
