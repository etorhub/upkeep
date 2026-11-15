import type { HomeAssistant } from 'custom-card-helpers';

export const TAG_SCAN_TIMEOUT_MS = 30000;

/** Map a scanned tag id to its `tag.*` entity, or keep the raw id when none is registered. */
export function resolveScannedTag(hass: HomeAssistant | undefined, scannedId: string): string {
  const states = hass?.states ?? {};
  for (const [entityId, stateObj] of Object.entries(states)) {
    if (entityId.startsWith('tag.') && stateObj?.attributes?.tag_id === scannedId) {
      return entityId;
    }
  }
  return scannedId;
}

/**
 * Wait for the next tag scan. Resolves the returned stop function at once; `onScan`
 * runs once with the linked value, then the subscription closes. `onStop` runs on
 * scan, timeout or stop, so the UI can leave its waiting state.
 */
export async function listenForTagScan(
  hass: HomeAssistant,
  onScan: (value: string) => void,
  onStop: () => void,
  timeoutMs: number = TAG_SCAN_TIMEOUT_MS
): Promise<() => void> {
  let done = false;
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = (): void => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    unsubscribe?.();
    onStop();
  };

  const subscription = await hass.connection.subscribeEvents((event: unknown) => {
    const tagId = (event as { data?: { tag_id?: string } })?.data?.tag_id;
    if (done || !tagId) return;
    onScan(resolveScannedTag(hass, tagId));
    stop();
  }, 'tag_scanned');
  unsubscribe = subscription;
  if (done) {
    subscription();
  } else {
    timer = setTimeout(stop, timeoutMs);
  }
  return stop;
}
