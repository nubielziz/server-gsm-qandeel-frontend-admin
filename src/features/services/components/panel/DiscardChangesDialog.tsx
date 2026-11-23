// DiscardChangesDialog: the question asked before the service panel changes row or closes while a section holds unsaved changes.
import { ConfirmDialog } from '@/components/ui';
import { PANEL_SECTIONS } from '../../lib/panelSections';
import type { PanelSectionId } from './types';

export interface DiscardChangesDialogProps {
  /** The sections that hold unsaved changes; the dialog names them. */
  sections: readonly PanelSectionId[];
  /** Go on and lose the changes. */
  onDiscard: () => void;
  /** Stay where the staff member is. */
  onKeep: () => void;
}

// "Details", "Details and Prices", "Details, Prices and Shop page".
function sentence(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Discard your unsaved changes?" with the sections that would lose them. Mount it while a move is held back. */
export function DiscardChangesDialog({ sections, onDiscard, onKeep }: DiscardChangesDialogProps) {
  const names = PANEL_SECTIONS.filter((spec) => sections.includes(spec.id)).map((spec) => spec.title);
  return (
    <ConfirmDialog
      open
      title="Discard your unsaved changes?"
      body={
        <p>
          {names.length > 0
            ? `You have unsaved changes in ${sentence(names)}. `
            : 'You have unsaved changes. '}
          If you go on, they are lost.
        </p>
      }
      confirm="Discard changes"
      cancel="Keep editing"
      kind="danger"
      onClose={onKeep}
      onConfirm={onDiscard}
    />
  );
}
