// ShopPublishFailure: the failed publish of a service that has no shop page: why in the publish screens' words, when, and a link to the run.
import { Link } from 'react-router';
import { Badge } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { resultWords } from '../../lib/publishWords';
import { storefrontPublishPath } from '../../lib/paths';
import type { PublishItem } from '../../types';
import type { ShopPublishFailure as Failure } from './types';

/** The refusal as the result of a publish row reads it, the date of the try, and the way to the run. */
export function ShopPublishFailure({ failure }: { failure: Failure }) {
  const words = resultWords({
    result: 'refused',
    resultReason: failure.reason as PublishItem['resultReason'],
    resultDetail: failure.detail ?? null,
  });
  return (
    <div
      role="group"
      aria-label="Failed publish"
      className="space-y-1.5 rounded-md border border-line p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={words.tone} icon={words.icon}>
          {words.label}
        </Badge>
        <span className="text-xs text-ink3">{fmtDate(failure.at)}</span>
      </div>
      <p className="text-ink2">The last publish run could not put this service on the shop.</p>
      {words.note && <p className="text-ink2">{words.note}</p>}
      <Link className="link text-xs" to={storefrontPublishPath(failure.runId)}>
        See publish run {failure.runId}
      </Link>
    </div>
  );
}
