import { BUILTIN_PROFILES } from "../config/profiles";
import { getActiveProfileKey, getAppData, saveToLocal } from "../state/store";
import { formatNumber, showToast } from "../utils/format";
import { analytics } from "./analytics";

export function initOdometerListeners(
  onLiveUpdate: () => void,
  onFullRender: () => void,
): void {
  document.getElementById("currentMileageInput")?.addEventListener("input", (e) => {
    const appData = getAppData();
    if (!appData || !appData.vehicle) return;
    const val = Number((e.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 0) {
      appData.vehicle.currentMileageKm = val;
      saveToLocal(true);
      onLiveUpdate();
    }
  });

  document.getElementById("currentMileageInput")?.addEventListener("change", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 0) {
      analytics.event("odometer_updated", { mileage_km: val, method: "manual" });
    }
  });

  document.querySelectorAll<HTMLButtonElement>(".km-step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const appData = getAppData();
      if (!appData || !appData.vehicle) return;
      const step = Number(btn.getAttribute("data-km-step")) || 1000;
      appData.vehicle.currentMileageKm = (Number(appData.vehicle.currentMileageKm) || 0) + step;
      saveToLocal(true);
      onFullRender();
      analytics.event("odometer_updated", {
        mileage_km: appData.vehicle.currentMileageKm,
        step_km: step,
        method: "step_button",
      });
      showToast(`Odometer: ${formatNumber(appData.vehicle.currentMileageKm)} km`);
    });
  });

  document.getElementById("resetMileageBtn")?.addEventListener("click", () => {
    const appData = getAppData();
    const activeProfileKey = getActiveProfileKey();
    if (!appData || !appData.vehicle) return;
    const defKm = (activeProfileKey && BUILTIN_PROFILES[activeProfileKey]?.vehicle?.currentMileageKm) || 0;
    appData.vehicle.currentMileageKm = defKm;
    saveToLocal(true);
    onFullRender();
    analytics.event("odometer_reset", { mileage_km: defKm });
    showToast("Odometer reset");
  });
}
