// The contract between the service panel of the Catalog page and its sections: the ids a section may have and the props
// every section component takes. Sections are built apart and listed in lib/panelSections.
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import type { Service } from '../../types';

/** The sections of the panel, in the order it shows them. The address names one with `section=<id>`. */
export const PANEL_SECTION_IDS = [
  'details',
  'order-form',
  'suppliers',
  'prices',
  'shop',
  'activity',
] as const;

/** One of {@link PANEL_SECTION_IDS}. */
export type PanelSectionId = (typeof PANEL_SECTION_IDS)[number];

/**
 * Asks the unsaved-changes guard before a move that leaves the panel for good (another view, another page). It carries `go` out at
 * once when no section holds changes, and after the staff member agrees to lose them otherwise.
 */
export type LeaveGate = (go: () => void) => void;

/**
 * What every section of the panel receives. A section reads the detail of the service itself when it needs more than the
 * row, and keeps the permission of each of its controls.
 */
export type PanelSectionProps = {
  /** The row of the open service, as the table has it. */
  service: Service;
  /** The staff member's permissions on the page. */
  grants: ServiceGrants;
  /** The address names this section: it scrolls into view and takes focus. */
  active: boolean;
  /** The section says whether it holds unsaved changes, so the panel can ask before it closes or changes service. */
  onDirtyChange: (dirty: boolean) => void;
  /** A link of the section that leaves the panel goes through this first (see {@link LeaveGate}); without it the link just goes. */
  onLeave?: LeaveGate;
};
