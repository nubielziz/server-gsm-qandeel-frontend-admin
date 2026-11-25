// groupColumns: the columns of the Group table in the list skin: Group Name, Order (up and down buttons), Status (a square that is a button),
// Visible to, Services and Actions (the square-pen link to the edit view). Pure drawing: what a click does is handed in.
import { Button, ButtonLink, cx, Icon, SquareToggle, type DataTableColumn } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { visibleToText } from '../../../lib/categories';
import { productsPath } from '../../../lib/productsPath';
import type { NamedRef, ServiceCategory } from '../../../types';

/** A control kept off for a role that lacks a permission: the lock and the reason in words. */
export type Lock = { disabled: boolean; title?: string };

export interface GroupColumnsOptions {
  type: ServiceType;
  /** Every group of the kind in order (not only the page), so the first and the last can be told. */
  ordered: readonly ServiceCategory[];
  /** The ranks by name; undefined when the role cannot read them (the cell then counts them). */
  ranks: readonly NamedRef[] | undefined;
  /** `catalog:update`: switching a group and moving it. */
  updateLock: Lock;
  /** The group whose switch is being saved, shown as busy. */
  busyId: Id | null;
  /** The group just added, marked for a moment (the Group view opened on it after Add). */
  markedId: Id | null;
  /** A search is on: the list is only some of the groups, so the order buttons are off (the order only makes sense in the whole list). */
  searching: boolean;
  onToggle: (group: ServiceCategory) => void;
  onMove: (group: ServiceCategory, direction: 'up' | 'down') => void;
}

/** The columns, in the order of the layout the owner asked for (the telegram column is left out: a group has no such setting). */
export function groupColumns({
  type,
  ordered,
  ranks,
  updateLock,
  busyId,
  markedId,
  searching,
  onToggle,
  onMove,
}: GroupColumnsOptions): DataTableColumn<ServiceCategory>[] {
  const last = ordered.length - 1;
  const moveButton = (group: ServiceCategory, direction: 'up' | 'down') => {
    const at = ordered.findIndex((candidate) => candidate.id === group.id);
    const edge = direction === 'up' ? at <= 0 : at === last;
    return (
      <Button
        size="sm"
        variant="ghost"
        icon
        aria-label={`Move ${group.name} ${direction}`}
        disabled={updateLock.disabled || searching || edge}
        title={
          updateLock.title ??
          (searching
            ? 'Clear the search to change the order'
            : edge
              ? direction === 'up'
                ? 'Already first'
                : 'Already last'
              : `Move ${direction}`)
        }
        onClick={() => onMove(group, direction)}
      >
        <Icon name={direction === 'up' ? 'arrowUp' : 'arrowDown'} className="ic-sm" />
      </Button>
    );
  };

  return [
    {
      key: 'name',
      label: 'Group Name',
      // The name takes the spare width, so the other columns pack to the right as in the layout the owner asked for.
      className: 'w-full',
      render: (group) => (
        <span
          aria-current={group.id === markedId ? 'true' : undefined}
          className={cx(
            !group.isActive && 'text-ink3',
            group.id === markedId && '-mx-1.5 rounded bg-accent-soft px-1.5 py-0.5 font-medium',
          )}
        >
          {group.name}
        </span>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      render: (group) => (
        <span className="inline-flex gap-0.5">
          {moveButton(group, 'up')}
          {moveButton(group, 'down')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (group) => (
        <SquareToggle
          on={group.isActive}
          label={`Active: ${group.name}`}
          busy={busyId === group.id}
          disabled={updateLock.disabled}
          title={
            updateLock.title ??
            (group.isActive ? 'Active. Click to deactivate.' : 'Inactive. Click to activate.')
          }
          onToggle={() => onToggle(group)}
        />
      ),
    },
    {
      key: 'visible',
      label: 'Visible to',
      hide: 'md',
      render: (group) => (
        <span className="block max-w-[260px] truncate text-ink2">
          {visibleToText(group.allowedGroupIds, ranks)}
        </span>
      ),
    },
    {
      key: 'services',
      label: 'Services',
      num: true,
      hide: 'sm',
      render: (group) => group.serviceCount ?? '–',
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-px whitespace-nowrap text-right',
      render: (group) => (
        <ButtonLink
          size="sm"
          variant="ghost"
          icon
          aria-label={`Edit ${group.name}`}
          title={`Edit ${group.name}`}
          to={productsPath({ view: 'edit-group', type, id: group.id })}
        >
          <Icon name="squarePen" className="ic-sm" />
        </ButtonLink>
      ),
    },
  ];
}
