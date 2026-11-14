/**
 * Locks background page scrolling whenever any modal dialog (`[aria-modal="true"]`)
 * is open (i.e. does not have the `hidden` class).
 */
export function initModalScrollLock(): void {
  const modals = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'));
  if (modals.length === 0) return;

  const syncScrollLock = (): void => {
    const anyOpen = modals.some((modal) => !modal.classList.contains("hidden"));
    document.documentElement.classList.toggle("overflow-hidden", anyOpen);
    document.body.classList.toggle("overflow-hidden", anyOpen);
  };

  const observer = new MutationObserver(syncScrollLock);
  modals.forEach((modal) => {
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  });

  syncScrollLock();
}
