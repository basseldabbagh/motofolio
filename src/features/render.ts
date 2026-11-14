import { getAppData, hasSavedCars } from "../state/store";
import { syncCategoryFilterOptions, syncFiltersToUrl } from "../utils/urlFilters";
import { renderSvgCharts } from "./charts";
import { renderFuelEfficiencySection } from "./fuel";
import {
  renderFooterSpecs,
  renderHeaderAndKPIs,
  syncProfileSelectOptions,
} from "./headerKpis";
import { populateLinkedItemSelect, renderHistoryList } from "./history";
import { renderPeriodicTable } from "./periodicSchedule";
import { renderWelcomeTemplates } from "./welcome";

export function renderDashboardLiveMetrics(): void {
  renderHeaderAndKPIs();
  renderPeriodicTable(renderDashboardLiveMetrics);
  renderSvgCharts();
}

export function renderFilterDependentViews(): void {
  renderHeaderAndKPIs();
  renderSvgCharts();
  renderHistoryList();
}

export function renderAll(): void {
  const welcomeView = document.getElementById("emptyGarageWelcomeView");
  const dashboardView = document.getElementById("vehicleDashboardView");
  const settingsReportsSection = document.getElementById("settingsReportsSection");
  const appData = getAppData();
  const hasCars = hasSavedCars() && Boolean(appData && appData.vehicle);

  if (!hasCars) {
    welcomeView?.classList.remove("hidden");
    dashboardView?.classList.add("hidden");
    settingsReportsSection?.classList.add("hidden");
    syncProfileSelectOptions();
    renderWelcomeTemplates();
    syncFiltersToUrl();
    return;
  }

  welcomeView?.classList.add("hidden");
  dashboardView?.classList.remove("hidden");
  settingsReportsSection?.classList.remove("hidden");

  syncCategoryFilterOptions();
  renderHeaderAndKPIs();
  renderPeriodicTable(renderDashboardLiveMetrics);
  renderSvgCharts();
  renderFuelEfficiencySection();
  renderHistoryList();
  renderFooterSpecs();
  populateLinkedItemSelect();
  syncFiltersToUrl();
}
