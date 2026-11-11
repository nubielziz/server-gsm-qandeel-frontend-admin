// ShellTopbarSlots: the controls features ask the shell to show in the top bar (manifest `topbar`), such as Notifications' bell. Each control
// decides on its own whether it has anything to fetch or show.
import { featureManifests } from '../features';

// Read once: manifests do not change while the app runs.
const SLOTS = featureManifests.flatMap((manifest) =>
  manifest.topbar ? [{ id: manifest.id, Slot: manifest.topbar }] : [],
);

/** Renders every feature's top bar control in manifest order. */
export function ShellTopbarSlots() {
  if (SLOTS.length === 0) return null;
  return (
    <>
      {SLOTS.map(({ id, Slot }) => (
        <Slot key={id} />
      ))}
    </>
  );
}
