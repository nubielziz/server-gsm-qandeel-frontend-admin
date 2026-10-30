// Tests for the assignment helpers: the agent and plan names, the agent filter's menu, and the agent count of each plan.
import { describe, expect, it } from 'vitest';
import type { CommissionAssignment } from '../types';
import { agentCounts, agentLabel, agentOptions, planLabel } from './assignment';

const assignment = (
  id: number,
  beneficiaryId: number,
  planId: number,
  name?: string,
): CommissionAssignment => ({
  id,
  planId,
  beneficiaryId,
  scope: 'referrals',
  startsAt: null,
  endsAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  beneficiary: name ? { id: beneficiaryId, name } : null,
  plan: planId === 1 ? { id: 1, name: 'Referral', percent: '3.0000' } : null,
});

describe('labels', () => {
  it('use the joined names and fall back to the ids', () => {
    expect(agentLabel(assignment(1, 5, 1, 'Cairo'))).toBe('Cairo');
    expect(agentLabel(assignment(1, 5, 1))).toBe('Merchant 5');
    expect(planLabel(assignment(1, 5, 1))).toBe('Referral');
    expect(planLabel(assignment(1, 5, 2))).toBe('Plan 2');
  });
});

describe('agentOptions', () => {
  const rows = [assignment(1, 5, 1, 'Cairo'), assignment(2, 1, 1, 'Amman'), assignment(3, 5, 2, 'Cairo')];

  it('lists All agents, then each agent once by name', () => {
    expect(agentOptions(rows, null)).toEqual([
      { value: '', label: 'All agents' },
      { value: 1, label: 'Amman' },
      { value: 5, label: 'Cairo' },
    ]);
  });

  it('keeps an agent chosen in the address even when it has no assignment', () => {
    expect(agentOptions(rows, 9).map((option) => option.label)).toEqual([
      'All agents',
      'Amman',
      'Cairo',
      'Merchant 9',
    ]);
  });
});

describe('agentCounts', () => {
  it('counts the assignments of each plan', () => {
    const counts = agentCounts([assignment(1, 5, 1), assignment(2, 1, 1), assignment(3, 2, 2)]);
    expect([counts.get(1), counts.get(2), counts.get(3)]).toEqual([2, 1, undefined]);
  });
});
