// Mock of the health route (`GET /health`), polled by the sidebar footer.
import { http, HttpResponse } from 'msw';
import { latency } from '../latency';

export const systemHandlers = [
  http.get('*/health', async () => {
    await latency();
    return HttpResponse.json({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } });
  }),
];
