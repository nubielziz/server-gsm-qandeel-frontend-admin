// RoleMatrix: the read-only "What each role can do" summary (the demo's role matrix in tabAdmins, now on the Roles tab). The
// demo had fixed levels per role (ROLE_MATRIX); here each cell is worked out from the role's real permissions (M11).
import { Panel, QueryState, SkeletonTable } from '@/components/ui';
import { areaLevel, areaNames, describeRole, ROLE_AREAS, type AreaLevel } from '../lib/permissions';
import type { Permission, Role } from '../types';

function Mark({ level }: { level: AreaLevel }) {
  if (level === 'full') return <span className="font-medium text-good-fg">Full</span>;
  if (level === 'view') return <span className="text-ink2">View</span>;
  if (level === 'partial') return <span className="text-warn-fg">Some</span>;
  return (
    <span className="text-ink3" aria-label="No access">
      –
    </span>
  );
}

export interface RoleMatrixProps {
  roles: readonly Role[];
  /** The permission catalog, once loaded. */
  catalog: readonly Permission[] | undefined;
  loading: boolean;
  /** Why the catalog could not be loaded, if it could not. */
  error?: unknown;
  onRetry: () => void;
}

/**
 * The read-only "what each role can do" table, worked out from the permissions each role really has.
 */
export function RoleMatrix({ roles, catalog, loading, error, onRetry }: RoleMatrixProps) {
  return (
    <Panel
      title="What each role can do"
      sub="Full means they can change things. View means they can look but not change. Some means a mix."
      flush={loading || Boolean(error)}
    >
      <QueryState
        isLoading={loading}
        isError={Boolean(error)}
        error={error}
        onRetry={onRetry}
        errorTitle="Could not load the permissions"
        skeleton={<SkeletonTable cols={5} rows={3} />}
      >
        <div className="tbl-wrap">
          <table className="tbl" aria-label="Role permissions">
            <thead>
              <tr>
                <th scope="col">Role</th>
                {ROLE_AREAS.map((area) => (
                  <th key={area.name} scope="col" className="text-center" title={area.full}>
                    {area.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <th scope="row" className="!whitespace-normal !font-medium min-w-[15rem]">
                    <span className="block">{role.name}</span>
                    <span className="block text-2xs font-normal text-ink3">
                      {areaNames(role).join(', ') || describeRole(role)}
                    </span>
                  </th>
                  {ROLE_AREAS.map((area) => (
                    <td key={area.name} className="text-center">
                      <Mark level={areaLevel(role, area, catalog ?? [])} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </Panel>
  );
}
