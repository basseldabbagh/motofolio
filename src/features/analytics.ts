export type AnalyticsProperties = Record<string, unknown>;

export interface AnalyticsTracker {
  readonly name: string;
  init(): void;
  track(eventName: string, properties?: AnalyticsProperties): void;
}

interface PostHogInstance {
  capture?: (eventName: string, properties?: AnalyticsProperties) => void;
}

interface PostHogStub extends PostHogInstance {
  init?: (
    token: string,
    config: Record<string, unknown>,
    instanceName?: string,
  ) => void;
  _i?: Array<[string, Record<string, unknown>, string?]>;
  __SV?: number;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    posthog?: PostHogStub;
  }
}

/** Parses a comma-separated env string into a deduplicated array of non-empty IDs. */
function parseEnvIds(raw?: string): string[] {
  if (!raw || typeof raw !== "string") return [];
  const cleaned = raw
    .split(",")
    .map((id) => id.replace(/^["'`]+|["'`]+$/g, "").trim())
    .filter((id) => id.length > 0);
  return Array.from(new Set(cleaned));
}

function resolvePostHogAssetHost(apiHost: string): string {
  const normalized = apiHost.replace(/\/+$/, "");
  if (normalized.includes("eu.i.posthog.com")) {
    return "https://eu-assets.i.posthog.com";
  }
  if (normalized.includes("us.i.posthog.com")) {
    return "https://us-assets.i.posthog.com";
  }
  return normalized;
}

/**
 * Google Tag Manager tracker supporting one or more GTM container IDs.
 * All initialized containers listen to the shared `window.dataLayer`.
 */
class GtmTracker implements AnalyticsTracker {
  public readonly name = "gtm";
  private readonly ids: string[];

  constructor(ids: string[]) {
    this.ids = ids;
  }

  public init(): void {
    if (typeof document === "undefined" || this.ids.length === 0) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      "gtm.start": Date.now(),
      event: "gtm.js",
    });

    for (const gtmId of this.ids) {
      const scriptSrc = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
      const alreadyLoaded = document.querySelector(`script[src="${scriptSrc}"]`);
      if (alreadyLoaded) continue;

      const script = document.createElement("script");
      script.async = true;
      script.src = scriptSrc;
      document.head.appendChild(script);
    }
  }

  public track(eventName: string, properties?: AnalyticsProperties): void {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...(properties ?? {}),
    });
  }
}

/**
 * PostHog tracker supporting one or more PostHog project API keys.
 * Dynamically loads PostHog's browser SDK only when at least one key is configured.
 */
class PostHogTracker implements AnalyticsTracker {
  public readonly name = "posthog";
  private readonly ids: string[];
  private readonly apiHost: string;
  private readonly readyInstances = new Set<string>();
  private readonly pendingQueue: Array<{ eventName: string; properties?: AnalyticsProperties }> = [];
  private scriptInjected = false;

  constructor(ids: string[], apiHost: string) {
    this.ids = ids;
    this.apiHost = apiHost;
  }

  public init(): void {
    if (typeof document === "undefined" || this.ids.length === 0) return;

    const ph: PostHogStub = window.posthog || ({} as PostHogStub);
    ph._i = ph._i || [];
    ph.__SV = 1;
    window.posthog = ph;

    this.ids.forEach((token, index) => {
      const instanceName = `ph_${index}`;
      const config = {
        api_host: this.apiHost,
        autocapture: true,
        capture_pageview: true,
        loaded: () => {
          this.readyInstances.add(instanceName);
          this.flushPendingForInstance(instanceName);
        },
      };

      if (typeof ph.init === "function") {
        ph.init(token, config, instanceName);
      } else {
        ph._i?.push([token, config, instanceName]);
      }
    });

    if (!this.scriptInjected) {
      const assetHost = resolvePostHogAssetHost(this.apiHost);
      const scriptSrc = `${assetHost}/static/array.js`;
      if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = scriptSrc;
        document.head.appendChild(script);
      }
      this.scriptInjected = true;
    }
  }

  public track(eventName: string, properties?: AnalyticsProperties): void {
    if (typeof window === "undefined") return;

    let anyPending = false;
    this.ids.forEach((_token, index) => {
      const instanceName = `ph_${index}`;
      const instance = window.posthog?.[instanceName] as PostHogInstance | undefined;
      if (this.readyInstances.has(instanceName) && typeof instance?.capture === "function") {
        instance.capture(eventName, properties);
      } else {
        anyPending = true;
      }
    });

    if (anyPending && this.readyInstances.size < this.ids.length) {
      this.pendingQueue.push({ eventName, properties });
    }
  }

  private flushPendingForInstance(instanceName: string): void {
    const instance = window.posthog?.[instanceName] as PostHogInstance | undefined;
    if (typeof instance?.capture !== "function") return;

    for (const item of this.pendingQueue) {
      instance.capture(item.eventName, item.properties);
    }

    if (this.readyInstances.size >= this.ids.length) {
      this.pendingQueue.length = 0;
    }
  }
}

/**
 * Centralized Analytics facade.
 * To add or remove a tracker, register or remove it inside `init()` — no other files need changes.
 * If no tracker IDs are configured in environment variables, `init()` and `event()` are complete no-ops.
 */
export class Analytics {
  private trackers: AnalyticsTracker[] = [];
  private initialized = false;

  /**
   * Initializes all configured analytics trackers from Vite environment variables.
   * No-ops cleanly if neither `VITE_GTM_IDS` nor `VITE_POSTHOG_IDS` has any IDs.
   */
  public init(): void {
    if (this.initialized) return;

    const gtmIds = parseEnvIds(import.meta.env.VITE_GTM_IDS);
    const posthogIds = parseEnvIds(import.meta.env.VITE_POSTHOG_IDS);
    const posthogHost = (import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com")
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim() || "https://us.i.posthog.com";

    if (gtmIds.length > 0) {
      this.trackers.push(new GtmTracker(gtmIds));
    }
    if (posthogIds.length > 0) {
      this.trackers.push(new PostHogTracker(posthogIds, posthogHost));
    }

    if (this.trackers.length === 0) {
      return;
    }

    this.initialized = true;

    for (const tracker of this.trackers) {
      try {
        tracker.init();
      } catch (err) {
        console.warn(`[Analytics] Failed to initialize tracker "${tracker.name}":`, err);
      }
    }
  }

  /** Returns true when at least one tracker was configured and initialized. */
  public isEnabled(): boolean {
    return this.initialized && this.trackers.length > 0;
  }

  /**
   * Sends the same event and properties to all initialized trackers.
   * No-ops if no tracker IDs were configured in the environment.
   */
  public event(eventName: string, properties?: AnalyticsProperties): void {
    if (!this.isEnabled() || !eventName) return;

    const payload: AnalyticsProperties = {
      ...(typeof window !== "undefined" ? { page_path: window.location.pathname } : {}),
      ...(typeof document !== "undefined" ? { page_title: document.title } : {}),
      ...(properties ?? {}),
    };

    for (const tracker of this.trackers) {
      try {
        tracker.track(eventName, payload);
      } catch (err) {
        console.warn(`[Analytics] Tracker "${tracker.name}" failed on event "${eventName}":`, err);
      }
    }
  }
}

export const analytics = new Analytics();
