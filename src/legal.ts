import { applyGoogleSignInVisibility } from "./config/features";
import { initTailwindConfig } from "./config/tailwind";
import { analytics } from "./features/analytics";
import { initCookieConsent } from "./features/cookieConsent";
import { initPwaInstall } from "./features/pwaInstall";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";

// Apply initial theme and Tailwind tokens immediately to prevent FOUC
applyInitialThemeClass();
initTailwindConfig();

document.addEventListener("DOMContentLoaded", () => {
  applyGoogleSignInVisibility();
  analytics.init();
  analytics.event("page_view", { page: "legal" });
  initThemeFeature();
  initCookieConsent();
  initPwaInstall();
});
