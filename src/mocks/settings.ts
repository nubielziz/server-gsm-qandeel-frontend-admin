// Mock system settings: one flat object of keys. `adminAllowlistOnly` comes from the demo's `access.restrict`, the
// storefront policies from the demo's `settings.policies`.
import { loadDemoState } from './seed';

/** The settings as the mock keeps them. */
export type MockSettings = Record<string, unknown>;

let store: Promise<MockSettings> | undefined;

/** The settings object, seeded from the demo on first use. Handlers change it in place. */
export function settingsStore(): Promise<MockSettings> {
  store ??= loadDemoState().then((state) => {
    const access = state.access as { restrict?: boolean } | undefined;
    const settings = state.settings as { policies?: Record<string, unknown> } | undefined;
    return { ...settings?.policies, adminAllowlistOnly: access?.restrict ?? false };
  });
  return store;
}

/** Drops the object so the next use re-seeds it (tests). */
export function resetSettingsStore(): void {
  store = undefined;
}
