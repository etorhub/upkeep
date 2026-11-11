export function pointerOutside(
  event: { clientX: number; clientY: number },
  dialog: HTMLElement
): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}

/** Backdrop taps for browsers that ignore dialog closedby. */
export function bindSheetLightDismiss(dialog: HTMLElement): void {
  if (dialog.dataset.lightDismiss === 'true') return;
  dialog.dataset.lightDismiss = 'true';
  if (typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype) return;
  let pressedOutside = false;
  dialog.addEventListener('pointerdown', (event) => {
    pressedOutside = pointerOutside(event, dialog);
  });
  dialog.addEventListener('pointerup', (event) => {
    if (!pressedOutside || !pointerOutside(event, dialog)) return;
    const closer = dialog as HTMLDialogElement;
    if (typeof closer.close === 'function') closer.close();
    else dialog.dispatchEvent(new Event('close'));
  });
}
