// Public surface of the settings feature: the `/admin/settings`, payment gateway, tax rate, currency, storefront settings, notification and
// webhook API functions, their types, the sandboxed `PreviewFrame` (the notification campaigns preview with it), the data-provider
// registry, the read hook for the flat settings, and `settingsPath` for links into a tab (`/settings?tab=tax`). The page itself is not re-exported here: it loads lazily from `./pages`.
export * from './api';
export * from './components/PreviewFrame';
export * from './hooks/useSettings';
export { settingsPath, type SettingsTab } from './lib/tabs';
export * from './types';
