// ShellBanners: the notices features ask the shell to show above every page (manifest `banner`), such as System
// health's "maintenance is on". Each banner decides on its own whether it has anything to show.
import { featureManifests } from '../features';

// Read once: manifests do not change while the app runs.
const BANNERS = featureManifests.flatMap((manifest) =>
  manifest.banner ? [{ id: manifest.id, Banner: manifest.banner }] : [],
);

/** Renders every feature banner in manifest order, between the top bar and the page. */
export function ShellBanners() {
  if (BANNERS.length === 0) return null;
  return (
    <>
      {BANNERS.map(({ id, Banner }) => (
        <Banner key={id} />
      ))}
    </>
  );
}
