// openPart: which part of the record is open, for the two components that need it (the page holds the part's unsaved mark, OpenAccount
// draws the part): the parts the role may see, and the one the address names, or the first one when it names none (or one the role may
// not see, or one that does not apply to this account). The address is not rewritten.
import type { AccountDetail } from '../../types';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { AccountPartId } from '../types';
import { visibleParts } from './accountParts';

/**
 * The parts the role may see and the one that is open. `scope` names that part of that account: one unsaved mark and one start per scope.
 * Side effects: none.
 */
export function openPart(account: AccountDetail, part: AccountPartId | null, grants: AccountGrants) {
  const parts = visibleParts(grants, account);
  const current = parts.find((candidate) => candidate.id === part) ?? parts[0];
  return { parts, current, scope: `${account.id}:${current?.id ?? ''}` };
}
