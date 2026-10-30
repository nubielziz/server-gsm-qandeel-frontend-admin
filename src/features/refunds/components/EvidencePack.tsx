// EvidencePack: the dispute's evidence pack, one line per proof with a tick or a warning, and how strong the case looks. Ports
// the "Evidence pack" block of the dp-open dialog in 53-p-refunds.js. While the dispute is waiting for evidence each line has a
// checkbox: the lines ticked are what "Submit evidence" sends. The pack and its strength come from the server.
import { Badge, ErrorState, Icon, Skeleton } from '@/components/ui';
import { badgeFor, STRENGTH_BADGE } from '../lib/labels';
import type { Dispute } from '../types';

export interface EvidencePackProps {
  dispute: Dispute;
  /** The single read failed, so the pack cannot be shown. */
  error?: unknown;
  failed: boolean;
  onRetry: () => void;
  /** The keys of the lines that are ticked; with `onToggle` the lines can be changed. */
  picked: ReadonlySet<string>;
  onToggle?: (key: string) => void;
}

export function EvidencePack({ dispute, error, failed, onRetry, picked, onToggle }: EvidencePackProps) {
  const strength = dispute.strength ? badgeFor(STRENGTH_BADGE, dispute.strength) : null;
  return (
    <>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Evidence pack</h3>
        {strength && (
          <Badge tone={strength.tone} icon={strength.icon}>
            {strength.label}
          </Badge>
        )}
        <span className="text-xs text-ink3">compiled from the order record</span>
      </div>
      {dispute.evidence ? (
        <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
          {dispute.evidence.map((item) => (
            <li key={item.key} className="flex items-start gap-2.5 px-3 py-2 text-sm">
              {onToggle && (
                <input
                  type="checkbox"
                  className="check mt-1"
                  aria-label={`Include ${item.title}`}
                  checked={picked.has(item.key)}
                  onChange={() => onToggle(item.key)}
                />
              )}
              <span className={`mt-0.5 flex-none ${item.ok ? 'text-good-fg' : 'text-warn-fg'}`}>
                <Icon name={item.ok ? 'checkCircle' : 'alert'} className="ic-sm" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className="text-ink2">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : failed ? (
        <ErrorState title="Could not load the evidence pack" error={error} onRetry={onRetry} />
      ) : (
        <div
          className="space-y-2 rounded-lg border border-line p-3"
          role="status"
          aria-label="Loading the evidence pack"
        >
          <Skeleton width="40%" />
          <Skeleton />
          <Skeleton width="70%" />
        </div>
      )}
    </>
  );
}
