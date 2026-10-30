// Every feature manifest (`src/features/<name>/manifest.ts`), found at build time. Resources, routes, the palette and
// the sidebar counts read them from here, so adding a feature never touches these shared files.
import type { FeatureManifest } from './featureManifest';

const modules = import.meta.glob<{ manifest: FeatureManifest }>('../features/*/manifest.ts', {
  eager: true,
});

/**
 * Checks the manifests once at start-up: a missing export, a duplicate id or two features claiming one page are
 * mistakes in the code, so they fail loudly instead of hiding a page or a registry.
 */
export function collectManifests(found: Record<string, { manifest?: FeatureManifest }>): FeatureManifest[] {
  const manifests = Object.entries(found).map(([file, module]) => {
    if (!module.manifest) throw new Error(`${file} must export \`manifest\``);
    return module.manifest;
  });
  const seen = new Set<string>();
  const pages = new Set<string>();
  for (const manifest of manifests) {
    if (seen.has(manifest.id)) throw new Error(`Two feature manifests use the id "${manifest.id}"`);
    seen.add(manifest.id);
    if (manifest.page) {
      if (pages.has(manifest.page.name))
        throw new Error(`Two features fill the page "${manifest.page.name}"`);
      pages.add(manifest.page.name);
    }
  }
  // Sorted by id, so registries merge and palette sources list in a stable order.
  return manifests.sort((a, b) => a.id.localeCompare(b.id));
}

export const featureManifests: readonly FeatureManifest[] = collectManifests(modules);

/** The manifest that fills a page, if its feature is built. */
export function featureForPage(name: string): FeatureManifest | undefined {
  return featureManifests.find((manifest) => manifest.page?.name === name);
}
