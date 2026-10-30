// SetupFailure: what the two-step setup screen shows when the server could not start the setup.
import { Icon } from '@/components/ui';
import { AuthButton } from './AuthButton';
import { describeAuthError } from './authErrors';
import { FormMessage } from './FormMessage';

/** The server's reason (announced at once) and a Retry that asks for a new setup key. */
export function SetupFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const info = describeAuthError(error);
  return (
    <div className="space-y-4">
      <div role="alert">
        <FormMessage
          title="Could not start the setup"
          detail={info.detail ?? info.title}
          requestId={info.requestId}
        />
      </div>
      <AuthButton variant="secondary" onClick={onRetry}>
        <Icon name="refresh" className="ic-sm" />
        Retry
      </AuthButton>
    </div>
  );
}
