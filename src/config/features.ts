/**
 * Central feature-flag helpers driven by Vite environment variables.
 */

export function isGoogleSignInEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_GOOGLE_SIGN_IN === "true";
}

/**
 * Toggles DOM elements marked with `data-google-signin="enabled"` or
 * `data-google-signin="disabled"` so marketing copy, FAQs, and policy sections
 * match `VITE_ENABLE_GOOGLE_SIGN_IN` in both dev and production builds.
 */
export function applyGoogleSignInVisibility(root: ParentNode = document): void {
  const enabled = isGoogleSignInEnabled();

  root.querySelectorAll<HTMLElement>('[data-google-signin="enabled"]').forEach((el) => {
    el.classList.toggle("hidden", !enabled);
    el.hidden = !enabled;
  });

  root.querySelectorAll<HTMLElement>('[data-google-signin="disabled"]').forEach((el) => {
    el.classList.toggle("hidden", enabled);
    el.hidden = enabled;
  });
}
