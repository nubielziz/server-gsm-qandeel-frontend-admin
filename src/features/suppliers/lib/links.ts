// The draft of a service's supplier chain while the "Edit links" dialog is open: the steps in order, moving and removing
// them, and the body that replaces the chain. Pure helpers; the server checks the result (`PUT /admin/services/:id/supplier-links`).
import type { Id } from '@/lib/api';
import type { ChainStep, ReplaceLinksBody } from '../types';

/**
 * One step of the draft. `supplierServiceId` is null for a supplier just added, until the staff member picks which of its
 * services the service is linked to. `key` is stable while steps move, so React keeps each row's state.
 */
export type DraftStep = {
  key: string;
  supplierId: Id;
  supplierName: string;
  supplierServiceId: Id | null;
  supplierServiceName: string;
};

let counter = 0;

/** A key no other step has had in this page's life. */
export function newStepKey(): string {
  counter += 1;
  return `step-${counter}`;
}

/** The draft that starts the dialog: the service's chain as it is now, in priority order. */
export function draftFromChain(chain: readonly ChainStep[]): DraftStep[] {
  return [...chain]
    .sort((a, b) => a.priority - b.priority)
    .map((step) => ({
      key: newStepKey(),
      supplierId: step.supplierId,
      supplierName: step.supplierName,
      supplierServiceId: step.supplierServiceId,
      supplierServiceName: step.supplierServiceName,
    }));
}

/** Moves a step to another place; an index outside the list leaves it as it is. */
export function moveStep(steps: readonly DraftStep[], from: number, to: number): DraftStep[] {
  if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) return [...steps];
  const next = [...steps];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The draft without one step. */
export function removeStep(steps: readonly DraftStep[], index: number): DraftStep[] {
  return steps.filter((_step, position) => position !== index);
}

/** The first step that still needs a supplier service, or undefined when the draft is complete. */
export function incompleteStep(steps: readonly DraftStep[]): DraftStep | undefined {
  return steps.find((step) => step.supplierServiceId === null);
}

/** The body of the PUT: each step's supplier service and its place, counting from 1. Steps without one are left out. */
export function toLinksBody(steps: readonly DraftStep[]): ReplaceLinksBody {
  return {
    links: steps.flatMap((step, index) =>
      step.supplierServiceId === null
        ? []
        : [{ supplierServiceId: step.supplierServiceId, priority: index + 1 }],
    ),
  };
}

/** Whether the draft is the chain the dialog started with (same supplier services in the same order). */
export function sameChain(steps: readonly DraftStep[], chain: readonly ChainStep[]): boolean {
  const ordered = [...chain].sort((a, b) => a.priority - b.priority);
  return (
    steps.length === ordered.length &&
    steps.every((step, index) => step.supplierServiceId === ordered[index].supplierServiceId)
  );
}

/** The word for a place in the chain: the first is Primary, the next ones Fallback (numbered from the third). */
export function roleLabel(priority: number): string {
  if (priority <= 1) return 'Primary';
  return priority === 2 ? 'Fallback' : `Fallback ${priority - 1}`;
}
