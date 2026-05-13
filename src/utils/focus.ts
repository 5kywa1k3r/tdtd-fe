type FocusReleaseEvent = {
  currentTarget?: EventTarget | null;
};

export function releaseFocusBeforeModal(event?: FocusReleaseEvent) {
  if (typeof document === 'undefined') return;

  const target = event?.currentTarget;
  if (target instanceof HTMLElement) {
    target.blur();
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}
