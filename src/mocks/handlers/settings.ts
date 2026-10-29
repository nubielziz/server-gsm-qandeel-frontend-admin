// Mock of the system settings routes (`GET` and `PATCH /admin/settings`): one flat object of keys that PATCH merges into.
import { http, HttpResponse } from 'msw';
import { latency } from '../latency';
import { guard } from '../session';
import { settingsStore } from '../settings';
import { bodyOf } from './accessShared';

export const settingsHandlers = [
  http.get('*/admin/settings', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return HttpResponse.json(await settingsStore());
  }),

  http.patch('*/admin/settings', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const settings = await settingsStore();
    Object.assign(settings, await bodyOf(request));
    return HttpResponse.json(settings);
  }),
];
