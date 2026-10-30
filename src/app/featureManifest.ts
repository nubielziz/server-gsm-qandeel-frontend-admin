// What a feature tells the app about itself, in `src/features/<name>/manifest.ts`. The app finds every manifest on its
// own (src/app/features.ts), so a new feature plugs in its pages, data registry, palette search and sidebar counts
// without editing any shared file.
import type { ComponentType } from 'react';
import type { ResourceRegistry } from '@/lib/api';
import type { NavCounts } from './layout/useNavCounts';
import type { PaletteSource } from './palette/paletteSources';

/**
 * A page component loaded on first visit, so each feature ships in its own chunk. Write it with a relative dynamic
 * import of the feature's pages entry: `() => import('./pages').then((m) => m.OrdersPage)`.
 */
export type PageLoader = () => Promise<ComponentType>;

/** The page a feature fills: one of the page resources of `src/app/resources.ts`, by name. */
export type FeaturePage = {
  /** Page resource name (`orders`, `customers`): the sidebar entry and the `/<name>` route. */
  name: string;
  /** The page's level-1 heading, which the route tests look for (it can differ from the sidebar label). */
  heading: string;
  /** The list view at `/<name>`. */
  list: PageLoader;
  /** The detail view at `/<name>/:id`, for the pages that have one (merchants, customers). */
  detail?: PageLoader;
  /**
   * Replaces the page permission set in `src/app/resources.ts`. A list means any one of them opens the page, for pages
   * whose tabs need different permissions; each tab then shows only what the role may read.
   */
  permission?: string | readonly string[];
};

export type FeatureManifest = {
  /** Feature id, as in `docs/feature-plan.json` (`orders`, `customers`). */
  id: string;
  page?: FeaturePage;
  /** The API functions behind Refine's data hooks for this feature's CRUD resources (decision 005). */
  registry?: ResourceRegistry;
  /** Searches the command palette runs while the user types. */
  palette?: readonly PaletteSource[];
  /**
   * The sidebar counts (open orders, pending payments…). One feature provides them (the dashboard); the shell calls
   * this hook on every page, so it must be cheap and must not fetch without the permission it needs.
   */
  useNavCounts?: () => NavCounts;
};
