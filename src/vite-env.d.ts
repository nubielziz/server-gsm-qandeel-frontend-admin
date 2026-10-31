/// <reference types="vite/client" />

// Typed environment variables (see .env.example for what each one does).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CSRF_COOKIE?: string;
  readonly VITE_STOREFRONT_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  readonly VITE_API_MOCKS?: 'true' | 'false';
  readonly VITE_GRAFANA_URL?: string;
  readonly VITE_SENTRY_URL?: string;
  readonly VITE_BULL_BOARD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
