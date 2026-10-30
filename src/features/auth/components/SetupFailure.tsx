// SetupFailure: the message and Retry button shown when the first-time authenticator setup cannot be started.
// Left-aligned and plain, like the other sign-in messages, instead of the kit's centred error block.
import { Button, Icon } from '@/components/ui';
import { describeAuthError } from './authErrors';
import { FormMessage } from './FormMessage';

export function SetupFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const info = describeAuthError(error);
  return (
    <div className="space-y-4">
      <FormMessage
        title="Could not start the setup"
        detail={info.detail ?? info.title}
        requestId={info.requestId}
      />
      <Button className="h-9" onClick={onRetry}>
        <Icon name="refresh" className="ic-sm" />
        Retry
      </Button>
    </div>
  );
}
