import { initCookieConsent } from "./features/cookieConsent";
import { initHomeFaqs } from "./features/homeFaqs";
import { initPwaInstall } from "./features/pwaInstall";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";

applyInitialThemeClass();

document.addEventListener("DOMContentLoaded", () => {
  initThemeFeature();
  initCookieConsent();
  initPwaInstall();
  void initHomeFaqs();
});
