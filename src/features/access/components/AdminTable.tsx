// AdminTable: the admin accounts table with the demo's columns (admin, role, status, 2FA, last sign-in, devices) and
// column sorting. Ports the `cols` of tabAdmins in 56-p-access.js. The name opens the drawer.
import { Avatar, Badge, Button, DataTable, TypeTag, type DataTableColumn } from '@/components/ui';
import { ago } from '@/lib/format';
import { useSortedRows } from '../hooks/useSortedRows';
import { timeValue, type SortValues } from '../lib/sort';
import { statusNote } from '../lib/staffText';
import type { StaffMember } from '../types';
import { StaffStatusBadge } from './StaffStatusBadge';

// What each sortable column compares (the demo's `val` functions).
const SORT_VALUES: SortValues<StaffMember> = {
  name: (member) => member.name.toLowerCase(),
  role: (member) => member.role.name.toLowerCase(),
  status: (member) => member.status,
  twofa: (member) => (member.twofaEnabled ? 1 : 0),
  last: (member) => timeValue(member.lastLoginAt),
  devices: (member) => member.activeSessions,
};

export interface AdminTableProps {
  staff: readonly StaffMember[];
  meId: number | undefined;
  now: number;
  onOpen: (member: StaffMember) => void;
}

/**
 * The accounts table. The list is short and loaded whole, so sorting happens here, in the browser.
 */
export function AdminTable({ staff, meId, now, onOpen }: AdminTableProps) {
  const { rows, sort, setSort } = useSortedRows(staff, SORT_VALUES, { field: 'name', order: 'asc' });

  const columns: DataTableColumn<StaffMember>[] = [
    {
      key: 'name',
      label: 'Admin',
      sortField: 'name',
      render: (member) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={member.name} />
          <div className="min-w-0">
            <button type="button" className="link font-medium" onClick={() => onOpen(member)}>
              {member.name}
            </button>
            {member.id === meId && <TypeTag className="ms-1">You</TypeTag>}
            <p className="truncate text-2xs text-ink3">{member.email}</p>
            <p className="mt-1 md:hidden">
              <TypeTag>{member.role.name}</TypeTag>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortField: 'role',
      hide: 'md',
      render: (member) => <TypeTag>{member.role.name}</TypeTag>,
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (member) => {
        const note = statusNote(member, now);
        return (
          <>
            <StaffStatusBadge status={member.status} />
            {note && <p className="mt-0.5 text-2xs text-ink3">{note}</p>}
          </>
        );
      },
    },
    {
      key: 'twofa',
      label: '2FA',
      sortField: 'twofa',
      hide: 'md',
      render: (member) =>
        member.twofaEnabled ? (
          <Badge tone="good" icon="shield">
            On
          </Badge>
        ) : member.status === 'invited' ? (
          <span className="text-xs text-ink3">At first sign-in</span>
        ) : (
          <Badge tone="warn" icon="alert">
            Off
          </Badge>
        ),
    },
    {
      key: 'last',
      label: 'Last sign-in',
      sortField: 'last',
      hide: 'sm',
      render: (member) =>
        member.lastLoginAt ? (
          <>
            <span className="text-ink2">{ago(member.lastLoginAt, now)}</span>
            {member.lastLoginIp && <p className="mono text-2xs text-ink3">{member.lastLoginIp}</p>}
          </>
        ) : (
          <span className="text-ink3">Never</span>
        ),
    },
    {
      key: 'devices',
      label: 'Devices',
      sortField: 'devices',
      num: true,
      hide: 'lg',
      render: (member) =>
        member.activeSessions ? member.activeSessions : <span className="text-ink3">0</span>,
    },
    {
      key: 'actions',
      label: '',
      hide: 'sm',
      render: (member) => (
        <Button size="sm" onClick={() => onOpen(member)}>
          Manage
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      caption="Admin accounts"
      columns={columns}
      rows={rows}
      rowKey={(member) => member.id}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
