import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';
import { listenForTagScan, resolveScannedTag } from '../panel-src/tag-scan';

function hassWith(states: Record<string, unknown>, subscribe = vi.fn()) {
  return { states, connection: { subscribeEvents: subscribe } } as unknown as HomeAssistant;
}

describe('resolveScannedTag', () => {
  it('maps a scanned tag id to its tag entity', () => {
    const hass = hassWith({ 'tag.garage': { attributes: { tag_id: 'uuid-1' } } });
    expect(resolveScannedTag(hass, 'uuid-1')).toBe('tag.garage');
  });

  it('keeps the raw id when no tag entity matches', () => {
    expect(resolveScannedTag(hassWith({}), 'uuid-2')).toBe('uuid-2');
  });
});

describe('listenForTagScan', () => {
  it('links the first scan, then unsubscribes', async () => {
    const unsubscribe = vi.fn();
    let emit: (event: unknown) => void = () => undefined;
    const subscribe = vi.fn(async (cb: (event: unknown) => void) => {
      emit = cb;
      return unsubscribe;
    });
    const hass = hassWith({ 'tag.garage': { attributes: { tag_id: 'u' } } }, subscribe);
    const onScan = vi.fn();
    const onStop = vi.fn();

    await listenForTagScan(hass, onScan, onStop);
    emit({ data: { tag_id: 'u' } });
    emit({ data: { tag_id: 'u' } });

    expect(subscribe).toHaveBeenCalledWith(expect.any(Function), 'tag_scanned');
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('tag.garage');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const hass = hassWith(
      {},
      vi.fn(async () => unsubscribe)
    );
    const onStop = vi.fn();
    await listenForTagScan(hass, vi.fn(), onStop, 1000);
    vi.advanceTimersByTime(1000);
    expect(unsubscribe).toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
