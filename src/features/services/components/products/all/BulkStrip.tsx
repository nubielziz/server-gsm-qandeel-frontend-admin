// BulkStrip: "Check All / Uncheck All   With selected: [Enable] [Disable] [Put on the shop] [Take off the shop] [Move to group] [Apply]
// [Delete]" under the table. Each button counts only the ticked services it would change and carries its permission; a progress line
// shows while a run goes; Delete asks first; what the server refused is told in one summary. The shop buttons show only for a role that
// may read the shop.
import { useState } from 'react';
import {
  BulkSummaryDialog,
  Button,
  ConfirmDialog,
  SelectField,
  WithSelected,
  type RowSelection,
} from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import { bulkTargets } from '../../../hooks/useServicesBulk';
import type { Service, ServiceCategory } from '../../../types';
import { useAllBulk } from './useAllBulk';

export interface BulkStripProps {
  type: ServiceType;
  /** The services on the page. */
  rows: readonly Service[];
  selection: RowSelection<number>;
  grants: ServiceGrants;
  /** The rows carry their shop page: the shop buttons are offered. */
  shop: boolean;
  /** The groups of the kind: the choices of Move to group. */
  groups: readonly ServiceCategory[];
}

const UNIT = { one: 'service', many: 'services' };

/** A lock for a button that has nothing to change among the ticked services. */
const none = (title: string) => ({ disabled: true, title });

const servicesText = (count: number) => `${count} ${count === 1 ? 'service' : 'services'}`;

/** The strip, the question before a delete, and the summary of refusals. */
export function BulkStrip({ type, rows, selection, grants, shop, groups }: BulkStripProps) {
  const { bulk, finish, summary, closeSummary } = useAllBulk(type, selection);
  const [target, setTarget] = useState('');
  const [asking, setAsking] = useState(false);
  const ticked = rows.filter((row) => selection.has(row.id));
  const targets = bulkTargets(ticked);
  const working = bulk.progress !== null || bulk.starting;
  const update = grants.needs('catalog:update');
  const group = groups.find((candidate) => String(candidate.id) === target);

  const enableLock = targets.enable.length === 0 ? none('Every ticked service is active already') : update;
  const disableLock =
    targets.disable.length === 0 ? none('Every ticked service is disabled already') : update;
  const putOnCount = targets.publish.length + targets.putBack.length;
  // The run needs storefront:create; switching a page back on needs storefront:update and storefront:publish.
  const putOnLock =
    putOnCount === 0
      ? none('Every ticked service is on the shop already')
      : grants.needsAll(
          ...(targets.publish.length > 0 ? ['storefront:create'] : []),
          ...(targets.putBack.length > 0 ? ['storefront:update', 'storefront:publish'] : []),
        );
  const takeOffLock =
    targets.takeOff.length === 0
      ? none('None of the ticked services is on the shop')
      : grants.needs('storefront:update');
  const deleteLock = grants.needs('catalog:delete');

  return (
    <>
      <WithSelected
        count={ticked.length}
        onCheckAll={() =>
          selection.setMany(
            rows.map((row) => row.id),
            true,
          )
        }
        onUncheckAll={selection.clear}
      >
        <Button
          size="sm"
          disabled={enableLock.disabled || working}
          title={enableLock.title}
          onClick={() => void finish(bulk.enable(ticked), ticked)}
        >
          Enable
        </Button>
        <Button
          size="sm"
          disabled={disableLock.disabled || working}
          title={disableLock.title}
          onClick={() => void finish(bulk.disable(ticked), ticked)}
        >
          Disable
        </Button>
        {shop && (
          <>
            <Button
              size="sm"
              loading={bulk.starting}
              disabled={putOnLock.disabled || working}
              title={putOnLock.title}
              onClick={() => void finish(bulk.putOn(ticked), ticked)}
            >
              Put on the shop
            </Button>
            <Button
              size="sm"
              disabled={takeOffLock.disabled || working}
              title={takeOffLock.title}
              onClick={() => void finish(bulk.takeOff(ticked), ticked)}
            >
              Take off the shop
            </Button>
          </>
        )}
        <SelectField
          aria-label="Move to group"
          options={[
            { value: '', label: 'Move to group…' },
            ...groups.map((candidate) => ({ value: candidate.id, label: candidate.name })),
          ]}
          value={target}
          disabled={update.disabled || working}
          title={update.title}
          selectWrapClassName="select-wrap-sm w-48"
          onChange={(event) => setTarget(event.target.value)}
        />
        <Button
          size="sm"
          disabled={!group || update.disabled || working}
          title={update.title}
          onClick={() => {
            if (!group) return;
            setTarget('');
            void finish(bulk.moveTo(ticked, group), ticked);
          }}
        >
          Apply
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={deleteLock.disabled || working}
          title={deleteLock.title}
          onClick={() => setAsking(true)}
        >
          Delete
        </Button>
      </WithSelected>
      {bulk.progress && (
        <p className="px-3.5 pb-2 text-sm text-ink2" role="status">
          {bulk.progress.verb} {bulk.progress.done} of {bulk.progress.total}…
        </p>
      )}
      <ConfirmDialog
        open={asking}
        title={`Delete ${servicesText(ticked.length)}?`}
        body={
          <p>
            The ticked services and their prices are removed. The server refuses a service that has orders;
            those are listed afterwards. To only stop new orders and keep the history, disable the service
            instead.
          </p>
        }
        confirm="Delete"
        kind="danger"
        onClose={() => setAsking(false)}
        onConfirm={() => {
          void finish(bulk.remove(ticked), ticked);
        }}
      />
      {summary && <BulkSummaryDialog summary={summary} unit={UNIT} onClose={closeSummary} />}
    </>
  );
}
