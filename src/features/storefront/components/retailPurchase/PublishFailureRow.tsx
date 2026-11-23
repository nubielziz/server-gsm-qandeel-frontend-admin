// PublishFailureRow: the failed publish of a service that has no shop page: why in the publish screens' words, when, and a link to the run.
import { Link } from 'react-router';
import { StatusSquare } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { storefrontPublishPath } from '../../lib/paths';
import { resultWords } from '../../lib/publishWords';
import type { PublishItem } from '../../types';
import type { ShopPublishFailure } from '../shop/types';

/** The refusal as the result of a publish row reads it, with a plain square for its state (no badge), the date of the try and the way to the run. */
export function PublishFailureRow({ failure }: { failure: ShopPublishFailure }) {
  const words = resultWords({
    result: 'refused',
    resultReason: failure.reason as PublishItem['resultReason'],
    resultDetail: failure.detail ?? null,
  });
  return (
    <div role="group" aria-label="Failed publish" className="space-y-1 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <StatusSquare tone="crit" label={words.label} />
        <span className="font-medium">{words.label}</span>
        <span className="cell-sub">{fmtDate(failure.at)}</span>
      </p>
      <p className="text-ink2">The last publish run could not put this service on the shop.</p>
      {words.note && <p className="text-ink2">{words.note}</p>}
      <Link className="link text-xs" to={storefrontPublishPath(failure.runId)}>
        See publish run {failure.runId}
      </Link>
    </div>
  );
}
