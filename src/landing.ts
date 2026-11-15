import { applyGoogleSignInVisibility } from "./config/features";
import { analytics } from "./features/analytics";
import { initCookieConsent } from "./features/cookieConsent";
import { initHomeFaqs } from "./features/homeFaqs";
import { initPwaInstall } from "./features/pwaInstall";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";

applyInitialThemeClass();

document.addEventListener("DOMContentLoaded", () => {
  applyGoogleSignInVisibility();
  analytics.init();
  analytics.event("page_view", { page: "landing" });
  initThemeFeature();
  initCookieConsent();
  initPwaInstall();
  void initHomeFaqs();
});
