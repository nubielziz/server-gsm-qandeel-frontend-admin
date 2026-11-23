// The keys of the panel's sections: a section that keeps a snapshot of the service in a form is mounted again from fresh data after the
// service was saved, but never while it holds edits that are not saved, so a save made in one section does not throw away what the
// staff member is typing in another. The other sections follow their props and queries and keep their key.
import { useState } from 'react';
import type { Id } from '@/lib/api';
import type { PanelSectionId } from '../components/panel/types';

/** What is known of the open service as text: the table's row and the service's detail; a part that has not loaded is undefined. */
export type PanelSignature = readonly [row: string | undefined, detail: string | undefined];

type Versions = Partial<Record<PanelSectionId, number>>;
type KeyState = { signature: PanelSignature; versions: Versions };

// A new version for every remountable section that is clean; the dirty ones keep their key, so their form and its text stay.
function bump(
  versions: Versions,
  dirty: readonly PanelSectionId[],
  remountable: readonly PanelSectionId[],
): Versions {
  const next: Versions = { ...versions };
  for (const id of remountable) if (!dirty.includes(id)) next[id] = (versions[id] ?? 0) + 1;
  return next;
}

/**
 * Returns `keyOf(section)`, the React key of a section's component. It is the service's id and a version that rises when the
 * service's data changed after it was first read (a save in a section or in a row-menu dialog, which refresh the row and the
 * detail). Only the `remountable` sections (the ones that hold a snapshot of the service in a form) get a new version; the others
 * keep theirs, so a refresh never drops their focus or an open dialog. Data that arrives where there was none is a first load and
 * changes nothing. Use it inside a panel keyed by the service.
 */
export function useSectionKeys(
  serviceId: Id,
  signature: PanelSignature,
  dirty: readonly PanelSectionId[],
  remountable: readonly PanelSectionId[],
) {
  const [state, setState] = useState<KeyState>({ signature, versions: {} });
  if (signature[0] !== state.signature[0] || signature[1] !== state.signature[1]) {
    const changed = signature.some(
      (part, index) =>
        part !== undefined && state.signature[index] !== undefined && part !== state.signature[index],
    );
    setState({ signature, versions: changed ? bump(state.versions, dirty, remountable) : state.versions });
  }
  return (section: PanelSectionId) => `${serviceId}-${state.versions[section] ?? 0}`;
}
