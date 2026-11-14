import { getAppData } from "../state/store";
import { copyTextSafe, formatNumber } from "../utils/format";
import { analytics } from "./analytics";
import { computeItemStatus } from "./periodicSchedule";

export function buildShareSummaryText(): string {
  const appData = getAppData();
  if (!appData || !appData.vehicle) {
    return (
      "My MotoFolio — Universal Vehicle Maintenance Tracker\n" +
      (window.location.origin.includes("pages.dev") ? window.location.href : "https://motofolio.pages.dev/")
    );
  }
  const v = appData.vehicle;
  const curKm = Number(v.currentMileageKm) || 0;
  const sched = appData.periodicSchedule || [];
  const activeLines = sched
    .filter((i) => i.lastServicedKm !== null && i.lastServicedKm !== undefined && String(i.lastServicedKm) !== "")
    .map((i) => {
      const st = computeItemStatus(i, curKm);
      return `• ${i.name}: Next @ ${formatNumber(st.nextDueKm)} km (${st.label})`;
    });

  return [
    `My MotoFolio Report: ${v.year || ""} ${v.make || ""} ${v.model || ""} (${v.plateNumber || "N/A"})`.trim(),
    `Odometer: ${formatNumber(curKm)} km | Updated: ${appData.lastUpdated || "—"}`,
    activeLines.length ? `\nTracked Services:\n${activeLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPrettyShareUrlText(): string {
  const appData = getAppData();
  const url = window.location.href;
  if (!appData || !appData.vehicle) {
    return [
      "My MotoFolio — Universal Vehicle Maintenance Tracker",
      "Track service intervals, odometer & workshop expenses privately:",
      url,
    ].join("\n");
  }
  const v = appData.vehicle;
  const vehicleName = `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || "My Vehicle";
  const plate = v.plateNumber ? ` (${v.plateNumber})` : "";
  const curKm = formatNumber(Number(v.currentMileageKm) || 0);
  return [
    `My MotoFolio — ${vehicleName}${plate}`,
    `Odometer: ${curKm} km | Updated: ${appData.lastUpdated || "—"}`,
    `View dashboard: ${url}`,
  ].join("\n");
}

export function initShareListeners(): void {
  const shareModal = document.getElementById("shareModal");

  const closeShareModal = (): void => {
    shareModal?.classList.add("hidden");
    shareModal?.classList.remove("flex");
  };

  document.getElementById("openShareModalBtn")?.addEventListener("click", () => {
    const preview = document.getElementById("shareSummaryPreview");
    if (preview) preview.textContent = buildShareSummaryText();
    shareModal?.classList.remove("hidden");
    shareModal?.classList.add("flex");
    analytics.event("share_modal_opened");
  });

  document.getElementById("closeShareModalBtn")?.addEventListener("click", closeShareModal);

  shareModal?.addEventListener("click", (e) => {
    if (e.target === shareModal) closeShareModal();
  });

  document.getElementById("nativeShareBtn")?.addEventListener("click", async () => {
    const appData = getAppData();
    const v = appData?.vehicle;
    const title = v
      ? `My MotoFolio — ${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim()
      : document.title || "My MotoFolio";
    const text = v
      ? buildShareSummaryText()
      : "Track your vehicle maintenance, service intervals & workshop expenses with My MotoFolio.";
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        analytics.event("share_triggered", { method: "native" });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    copyTextSafe(`${text}\n\n${url}`, "Native share unavailable — copied summary & link to clipboard!");
    analytics.event("share_triggered", { method: "native_fallback_copy" });
  });

  document.getElementById("copyShareTextBtn")?.addEventListener("click", () => {
    const text = buildShareSummaryText();
    copyTextSafe(text, "Report text copied for WhatsApp");
    analytics.event("share_triggered", { method: "whatsapp_text" });
  });

  document.getElementById("copyShareUrlBtn")?.addEventListener("click", () => {
    copyTextSafe(buildPrettyShareUrlText(), "Sharable link & summary copied to clipboard!");
    analytics.event("share_triggered", { method: "share_link" });
  });
}
