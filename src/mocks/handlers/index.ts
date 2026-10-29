// Every mock handler of the app. Features append theirs here (`...ordersHandlers`), most specific routes first:
// a generic `/:id` handler would otherwise answer `/export` or `/check`.
import type { RequestHandler } from 'msw';
import { resetSession, sessionHandlers } from '../session';
import { resetStaffStore } from '../staff';
import { systemHandlers } from './system';

export const handlers: RequestHandler[] = [...sessionHandlers, ...systemHandlers];

/** Puts all stateful mock stores back to their seed. For tests; add each feature's reset here. */
export function resetMockState(): void {
  resetSession();
  resetStaffStore();
}
