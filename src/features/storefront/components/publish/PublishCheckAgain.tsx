// PublishCheckAgain: "Prices as of <time>" and the Check again button of the preview. Check again makes a new draft from this one
// (`createPublishRun` with the scope `run`): every staff edit is kept and every row is worked out again with today's rules, costs
// and services. It is how a fix made outside the preview (a new rule, an enabled service, an opened category) reaches the rows.
import { useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useCreatePublishRun } from '../../hooks/usePublishMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { refusalText } from '../../lib/publish';
import type { PublishRun } from '../../types';

export interface PublishCheckAgainProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Goes to the new run, which is being prepared. */
  onOpen: (runId: number) => void;
}

const HINT = "Works everything out again with today's rules, costs and services. Your edits are kept.";

/** The line and the button; the server's refusal (a run still working, nothing left to publish) shows under them. */
export function PublishCheckAgain({ run, grants, onOpen }: PublishCheckAgainProps) {
  const create = useCreatePublishRun();
  const [error, setError] = useState<string | null>(null);
  const lock = grants.needs('storefront:create');
  const check = () => {
    setError(null);
    create.mutate(
      { scope: { kind: 'run', runId: run.id } },
      { onSuccess: (made) => onOpen(made.id), onError: (failure) => setError(refusalText(failure)) },
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2">
      <p className="flex-1 text-xs text-ink3">
        {run.preparedAt ? `Prices as of ${fmtDate(run.preparedAt)}` : 'Prices are as of today'}
      </p>
      <Button
        size="sm"
        loading={create.isPending}
        disabled={lock.disabled}
        title={lock.title ?? HINT}
        onClick={check}
      >
        <Icon name="refresh" className="ic-sm" />
        Check again
      </Button>
      {error && (
        <p className="w-full text-sm text-crit-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
