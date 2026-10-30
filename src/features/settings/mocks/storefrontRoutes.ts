// Mock of `PATCH /admin/storefront/settings`: the policies live in the shared settings mock (`src/mocks/settings.ts`), the object that
// `GET /admin/settings` serves, so a saved policy shows there too. The mock checks each value the way the real server would.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProblemError } from '@/mocks/problem';
import { settingsStore } from '@/mocks/settings';
import { bodyOf, invalid, signedIn } from './http';

const SWITCHES = ['guestCheckout', 'require3ds', 'withdrawalWaiver', 'autoRefundFailed', 'imeiPrecheck'];
// The number policies with the range the mock accepts and the sentence for a value outside it.
const NUMBERS: Record<string, { min: number; max: number; message: string }> = {
  refundHoursBeforeDispatch: { min: 0, max: 72, message: 'Enter 0 to 72 hours.' },
  abandonedMinutes: { min: 5, max: 1440, message: 'Enter 5 to 1,440 minutes.' },
  imeiRetentionDays: { min: 0, max: 3650, message: 'Enter 0 to 3,650 days.' },
};

/** The storefront settings route. */
export const storefrontRoutes: HttpHandler[] = [
  http.patch('*/admin/storefront/settings', ({ request }) =>
    signedIn(request, async () => {
      const settings = await settingsStore();
      const body = await bodyOf(request);
      const problems: ProblemError[] = [];
      for (const [key, value] of Object.entries(body)) {
        const range = NUMBERS[key];
        if (SWITCHES.includes(key)) {
          if (typeof value !== 'boolean') problems.push({ field: key, message: 'Choose on or off.' });
        } else if (range) {
          const ok =
            typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max;
          if (!ok) problems.push({ field: key, message: range.message });
        } else problems.push({ field: key, message: 'This is not a storefront setting.' });
      }
      if (problems.length > 0) return invalid(problems);
      Object.assign(settings, body);
      const policies = [...SWITCHES, ...Object.keys(NUMBERS)];
      return HttpResponse.json(Object.fromEntries(policies.map((key) => [key, settings[key]])));
    }),
  ),
];
