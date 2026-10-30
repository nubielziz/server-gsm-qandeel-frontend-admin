// FormMessage: a failure on a sign-in screen, as a quiet crit box: what went wrong, the next step, and the server's
// request id for support. Shown by FormAlert (the form's live summary) and by the two-step setup's failure state.
import { Icon } from '@/components/ui';
import type { AuthErrorInfo } from './authErrors';

/** The visible error box. It has no role of its own: the live region around it does the announcing. */
export function FormMessage({ title, detail, requestId }: AuthErrorInfo) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-crit-dot/25 bg-crit-bg px-3.5 py-3 text-crit-fg">
      <Icon name="alert" className="mt-px flex-none" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{title}</p>
        {detail && <p className="mt-0.5">{detail}</p>}
        {requestId && (
          <p className="mt-1.5 text-xs">
            Request <span className="font-mono">{requestId}</span>
          </p>
        )}
      </div>
    </div>
  );
}
