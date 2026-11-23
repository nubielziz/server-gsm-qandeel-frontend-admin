// A stand-in for the services grants of a signed-in staff member, for tests of code that takes `grants` as an argument. It answers like
// `useServiceGrants` does, from a list of permissions. Import it from tests only.
import { hasPermission } from '@/lib/auth/permissions';
import type { ServiceGrants } from '../hooks/useServiceGrants';

/** Grants that hold exactly these permissions (`area:*` and `*` cover as they do in the app). */
export function grantsOf(...permissions: string[]): ServiceGrants {
  const can = (permission: string) => hasPermission(permissions, permission);
  const needsAll = (...required: string[]): { disabled: boolean; title?: string } => {
    const missing = required.filter((permission) => !can(permission));
    return missing.length === 0
      ? { disabled: false }
      : { disabled: true, title: `You need the ${missing.join(' and ')} permission` };
  };
  return {
    me: undefined,
    ready: true,
    can,
    canAll: (required) => required.every(can),
    needs: (permission) => needsAll(permission),
    needsAll,
  };
}
