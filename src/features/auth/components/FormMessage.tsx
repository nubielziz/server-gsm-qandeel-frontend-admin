// FormMessage: the server's answer to a failed sign-in step, shown at the top of the form (title, detail, request ID).
import { NoticeBanner } from './NoticeBanner';
import type { AuthErrorInfo } from './authErrors';

export function FormMessage({ title, detail, requestId }: AuthErrorInfo) {
  return (
    <NoticeBanner tone="crit" icon="alert" title={title}>
      {detail && <p>{detail}</p>}
      {requestId && (
        <p className="mt-1 opacity-80">
          Request <span className="mono">{requestId}</span>
        </p>
      )}
    </NoticeBanner>
  );
}
