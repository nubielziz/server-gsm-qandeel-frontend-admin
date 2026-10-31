// What a failed health read tells the person: the server's title and detail, and the request id to quote. The verdict
// and the KPI cells show it in their own small way (they are too compact for the big `ErrorState`).
import { isApiError } from '@/lib/api';

export interface Failure {
  /** What failed, in the server's words ("Database unavailable"). */
  title: string;
  /** The longer explanation, when the server sent one. */
  detail?: string;
  /** `X-Request-Id` of the failed call, for support. */
  requestId?: string;
}

/** The parts of any thrown value that are worth showing. A plain `Error` gives its message as the title. */
export function failureOf(error: unknown): Failure {
  if (isApiError(error)) return { title: error.title, detail: error.detail, requestId: error.requestId };
  if (error instanceof Error) return { title: error.message };
  return { title: 'Something went wrong' };
}
