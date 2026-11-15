/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_GOOGLE_SIGN_IN?: string;
  readonly VITE_GTM_IDS?: string;
  readonly VITE_POSTHOG_IDS?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_SITE_VERIFICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
