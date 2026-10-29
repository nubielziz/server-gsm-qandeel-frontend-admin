// ErrorState: what failed, the request ID and a Retry button. Ports errorBlock() of 20-ui.js.
import { Button } from './Button';
import { errorParts } from './errorText';
import { Icon } from './Icon';

export interface ErrorStateProps {
  /** Short statement of what failed ("Could not load orders"). Falls back to the error's title. */
  title?: string;
  /** Longer explanation. Falls back to the error's detail or message. */
  detail?: string;
  /** Support reference from the server; hidden when there is none (for example a network failure). */
  requestId?: string;
  /** Any thrown value; the fields title, detail, message and requestId are read from it. */
  error?: unknown;
  /** Shows the Retry button when given. */
  onRetry?: () => void;
}

export function ErrorState({ title, detail, requestId, error, onRetry }: ErrorStateProps) {
  const parts = errorParts(error);
  const shownTitle = title ?? parts.title ?? 'Something went wrong';
  const shownDetail = detail ?? parts.detail;
  const shownRequest = requestId ?? parts.requestId;
  return (
    <div className="empty" role="alert">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crit-bg text-crit-fg">
        <Icon name="alert" />
      </span>
      <h3 className="text-base font-semibold">{shownTitle}</h3>
      {shownDetail && <p className="max-w-[46ch] text-sm text-ink2">{shownDetail}</p>}
      {shownRequest && (
        <p className="text-xs text-ink3">
          Request <span className="mono">{shownRequest}</span>
        </p>
      )}
      {onRetry && (
        <Button className="mt-1" onClick={onRetry}>
          <Icon name="refresh" className="ic-sm" />
          Retry
        </Button>
      )}
    </div>
  );
}
