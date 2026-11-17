// PublishSwitch: the run switch of a finished run's page: one button that takes everything the run published off the shop, or puts it
// back (nothing is deleted and no price changes). It is the undo of a mistaken run, and the "switch them on" of a run that was
// created switched off. While the server switches, a meter says how far; afterwards the note says how many could not be switched.
// Needs storefront:publish; the server decides which listings can move.
import { useState } from 'react';
import { Button, ConfirmDialog, Icon, Meter } from '@/components/ui';
import { num } from '@/lib/format';
import { useSetPublishRunListed } from '../../hooks/usePublishMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { isAlreadyRunning, isSwitchLive, refusalText } from '../../lib/publish';
import type { PublishRun } from '../../types';

export interface PublishSwitchProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Reads the run again (after a 409 that says a switch is already going). */
  onReread: () => void;
}

/** The words of the confirmation for each direction. */
function confirmWords(listed: boolean, count: number) {
  return listed
    ? {
        title: 'Take these services off the shop?',
        confirm: 'Take them off the shop',
        body: `This switches ${num(count)} listings off. Nothing is deleted and no price changes; you can put them back.`,
      }
    : {
        title: 'Put these services on the shop?',
        confirm: 'Put them on the shop',
        body: `This puts ${num(count)} listings on the shop at their current prices.`,
      };
}

/** The button, its confirmation, the progress and the result of the last switch. */
export function PublishSwitch({ run, grants, onReread }: PublishSwitchProps) {
  const [confirming, setConfirming] = useState(false);
  const setListed = useSetPublishRunListed();
  const lock = grants.needs('storefront:publish');
  const count = run.counts.published;
  // The button says what it will do: a run that is on the shop is taken off, anything else is put on.
  const target = !run.listed;
  const words = confirmWords(run.listed, count);
  const { status, switched, skipped } = run.switch;
  const live = isSwitchLive(run);

  const confirm = async () => {
    try {
      await setListed.mutateAsync({ id: run.id, body: { listed: target } });
    } catch (failure) {
      if (isAlreadyRunning(failure)) onReread();
      return refusalText(failure);
    }
  };

  return (
    <div className="space-y-2 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {live ? (
          <div className="min-w-[14rem] flex-1 space-y-1.5" aria-live="polite">
            <Meter
              ratio={count > 0 ? switched / count : 0}
              tone="neutral"
              label="Switch progress"
              className="w-full"
            />
            <p className="text-sm text-ink2">
              Switching {switched} of {count}
            </p>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} {...lock}>
            <Icon name={run.listed ? 'ban' : 'check'} className="ic-sm" />
            {run.listed ? `Take these ${count} off the shop` : `Put these ${count} on the shop`}
          </Button>
        )}
        {status === 'done' && <p className="text-sm text-ink2">{switched} switched</p>}
      </div>
      {status === 'done' && skipped > 0 && (
        <p className="rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="status">
          {skipped} could not be switched (a disabled service, a closed category or no price). The column On
          the shop shows which.
        </p>
      )}
      {status === 'failed' && (
        <p className="text-sm text-crit-fg" role="alert">
          {run.switch.error ?? 'The switch stopped before it finished.'}
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          open
          title={words.title}
          sub={`Run ${run.id}`}
          confirm={words.confirm}
          onClose={() => setConfirming(false)}
          onConfirm={confirm}
          body={words.body}
        />
      )}
    </div>
  );
}
