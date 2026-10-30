// Tests for the chain draft of the "Edit links" dialog: order, moving, removing, the body and the role words.
import { describe, expect, it } from 'vitest';
import type { ChainStep } from '../types';
import {
  draftFromChain,
  incompleteStep,
  moveStep,
  removeStep,
  roleLabel,
  sameChain,
  toLinksBody,
  type DraftStep,
} from './links';

const chain: ChainStep[] = [
  { priority: 2, supplierId: 1, supplierName: 'Nordic GSM', supplierServiceId: 20, supplierServiceName: 'B' },
  { priority: 1, supplierId: 3, supplierName: 'Rapid IMEI', supplierServiceId: 10, supplierServiceName: 'A' },
];

describe('draftFromChain', () => {
  it('starts from the chain in priority order, with a key per step', () => {
    const steps = draftFromChain(chain);
    expect(steps.map((step) => step.supplierName)).toEqual(['Rapid IMEI', 'Nordic GSM']);
    expect(new Set(steps.map((step) => step.key)).size).toBe(2);
  });
});

describe('moveStep and removeStep', () => {
  const steps = draftFromChain(chain);

  it('moves a step to another place and leaves the list alone for a place outside it', () => {
    expect(moveStep(steps, 1, 0).map((step) => step.supplierName)).toEqual(['Nordic GSM', 'Rapid IMEI']);
    expect(moveStep(steps, 0, 5)).toEqual(steps);
    expect(moveStep(steps, -1, 0)).toEqual(steps);
    expect(moveStep(steps, 1, 1)).toEqual(steps);
  });

  it('does not change the list it was given', () => {
    moveStep(steps, 1, 0);
    removeStep(steps, 0);
    expect(steps.map((step) => step.supplierName)).toEqual(['Rapid IMEI', 'Nordic GSM']);
  });

  it('removes one step', () => {
    expect(removeStep(steps, 0).map((step) => step.supplierName)).toEqual(['Nordic GSM']);
  });
});

describe('the body', () => {
  it('numbers the places from 1 and leaves out a step with no supplier service yet', () => {
    const steps: DraftStep[] = [
      ...draftFromChain(chain),
      { key: 'new', supplierId: 2, supplierName: 'Gulf', supplierServiceId: null, supplierServiceName: '' },
    ];
    expect(incompleteStep(steps)?.supplierName).toBe('Gulf');
    expect(toLinksBody(steps)).toEqual({
      links: [
        { supplierServiceId: 10, priority: 1 },
        { supplierServiceId: 20, priority: 2 },
      ],
    });
    expect(toLinksBody([])).toEqual({ links: [] });
  });

  it('knows when the draft is still the chain it started from', () => {
    const steps = draftFromChain(chain);
    expect(sameChain(steps, chain)).toBe(true);
    expect(sameChain(moveStep(steps, 1, 0), chain)).toBe(false);
    expect(sameChain(removeStep(steps, 1), chain)).toBe(false);
  });
});

describe('roleLabel', () => {
  it('calls the first place Primary and the next ones Fallback, numbered from the third', () => {
    expect([1, 2, 3, 4].map(roleLabel)).toEqual(['Primary', 'Fallback', 'Fallback 2', 'Fallback 3']);
  });
});
