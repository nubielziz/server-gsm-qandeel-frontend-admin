// Display helpers for assignments (the Agents tab): the agent's and the plan's names from the joins, falling back to the ids while
// the server sends no join, and the agent menu of the accruals filter. Ports `agents()` and `planOf` of 46-p-commissions.js.
import type { SelectOption } from '@/components/ui';
import type { CommissionAssignment } from '../types';

/** The agent's name from the join, or its merchant id. */
export function agentLabel(assignment: Pick<CommissionAssignment, 'beneficiary' | 'beneficiaryId'>): string {
  return assignment.beneficiary?.name ?? `Merchant ${assignment.beneficiaryId}`;
}

/** The plan's name from the join, or its id. */
export function planLabel(assignment: Pick<CommissionAssignment, 'plan' | 'planId'>): string {
  return assignment.plan?.name ?? `Plan ${assignment.planId}`;
}

/**
 * The agent filter's options: "All agents", then each agent once by name. An agent chosen in the address who has no assignment
 * (it ended, or the link is old) is added so the menu never shows one choice and filters by another.
 */
export function agentOptions(
  assignments: readonly CommissionAssignment[],
  chosen: number | null,
): SelectOption[] {
  const byId = new Map<number, string>();
  for (const assignment of assignments) byId.set(assignment.beneficiaryId, agentLabel(assignment));
  if (chosen !== null && !byId.has(chosen)) byId.set(chosen, `Merchant ${chosen}`);
  const named = [...byId]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [{ value: '', label: 'All agents' }, ...named];
}

/** How many agents each plan has, counted in the loaded assignments (display only). */
export function agentCounts(assignments: readonly CommissionAssignment[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const assignment of assignments)
    counts.set(assignment.planId, (counts.get(assignment.planId) ?? 0) + 1);
  return counts;
}
