import { initTailwindConfig } from "./config/tailwind";
import { analytics } from "./features/analytics";
import { initChartListeners } from "./features/charts";
import { initCookieConsent } from "./features/cookieConsent";
import { initPwaInstall } from "./features/pwaInstall";
import { initWebMcpTools } from "./features/webmcp";
import { initDataHubListeners } from "./features/dataHub";
import { initFuelListeners } from "./features/fuel";
import { autoSyncToGoogleDrive, initGoogleDriveListeners, isGoogleSignedIn } from "./features/googleDrive";
import { syncProfileSelectOptions } from "./features/headerKpis";
import { initHistoryListeners } from "./features/history";
import { initOdometerListeners } from "./features/odometer";
import { initPeriodicScheduleListeners, renderPeriodicTable } from "./features/periodicSchedule";
import {
  renderAll,
  renderDashboardLiveMetrics,
  renderFilterDependentViews,
} from "./features/render";
import { initReportListeners } from "./features/reports";
import { initVehicleAndSettingsListeners } from "./features/settings";
import { initShareListeners } from "./features/share";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";
import { initWelcomeListeners } from "./features/welcome";
import {
  getActiveProfileKey,
  getCustomProfilesMap,
  hasSavedCars,
  loadProfile,
  registerStoreCallbacks,
  setActiveProfileKey,
  setAppData,
} from "./state/store";
import { updateDynamicSEO } from "./utils/seo";
import { initModalScrollLock } from "./utils/modalScrollLock";
import { initGlobalFilterListeners, restoreFiltersFromUrl } from "./utils/urlFilters";

// Configure Tailwind CDN & initial theme class immediately
applyInitialThemeClass();
initTailwindConfig();

// Connect store persistence & rendering hooks
registerStoreCallbacks({
  onRenderAll: renderAll,
  onSyncProfileSelectOptions: syncProfileSelectOptions,
  onUpdateSeo: updateDynamicSEO,
  onAutoSyncDrive: autoSyncToGoogleDrive,
});

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isDashboardPath = window.location.pathname === "/dashboard" || window.location.pathname === "/dashboard/";
  const explicitDashboard =
    isDashboardPath || urlParams.get("view") === "dashboard" || urlParams.has("car") || urlParams.has("profile");

  if (!explicitDashboard && !hasSavedCars() && !isGoogleSignedIn() && window.location.protocol.startsWith("http")) {
    window.location.replace("/landing");
    return;
  }

  if (!isDashboardPath && window.location.protocol.startsWith("http")) {
    urlParams.delete("view");
    const nextSearch = urlParams.toString();
    const targetUrl = "/dashboard" + (nextSearch ? "?" + nextSearch : "") + window.location.hash;
    window.history.replaceState({}, "", targetUrl);
  }

  const customMap = getCustomProfilesMap();
  const savedKeys = Object.keys(customMap);

  restoreFiltersFromUrl();

  let activeProfileKey = getActiveProfileKey();
  if (activeProfileKey && !customMap[activeProfileKey]) {
    activeProfileKey = savedKeys.length > 0 ? savedKeys[0] : null;
    setActiveProfileKey(activeProfileKey);
  } else if (!activeProfileKey && savedKeys.length > 0) {
    activeProfileKey = savedKeys[0];
    setActiveProfileKey(activeProfileKey);
  }

  syncProfileSelectOptions();

  if (activeProfileKey && customMap[activeProfileKey]) {
    void loadProfile(activeProfileKey);
  } else {
    setActiveProfileKey(null);
    setAppData(null);
    renderAll();
  }

  window.addEventListener("popstate", () => {
    restoreFiltersFromUrl();
    const key = getActiveProfileKey();
    if (key && getCustomProfilesMap()[key]) {
      void loadProfile(key);
    } else {
      renderAll();
    }
  });

  // Initialize Feature Listeners
  analytics.init();
  analytics.event("page_view", { page: "dashboard" });
  initThemeFeature();
  initWelcomeListeners();
  initOdometerListeners(renderDashboardLiveMetrics, renderAll);
  initGlobalFilterListeners(renderFilterDependentViews);
  initPeriodicScheduleListeners(() => renderPeriodicTable(renderDashboardLiveMetrics), renderAll);
  initChartListeners();
  initFuelListeners(renderAll);
  initHistoryListeners(renderAll);
  initReportListeners();
  initDataHubListeners(renderAll);
  initShareListeners();
  initGoogleDriveListeners(renderAll);
  initVehicleAndSettingsListeners(renderAll);
  initModalScrollLock();
  initCookieConsent();
  initPwaInstall();
  initWebMcpTools();

  // Register Service Worker for PWA (Installable App & Offline Mode)
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {});
  }

  // Dismiss App Preloader smoothly
  const preloader = document.getElementById("appPreloader");
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => preloader.remove(), 400);
    }, 250);
  }
});
