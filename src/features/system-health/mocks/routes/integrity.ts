// Mock routes of the money integrity check: `GET /admin/system/integrity` and `POST /admin/system/integrity/run`
// (a background run that ends a few seconds later). The check only reads the ledger and never corrects anything.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { IntegrityReport, JobRun } from '../../types';
import { problem } from '@/mocks/problem';
import { buildIntegrity } from '../buildIntegrity';
import { route, staffRef } from '../http';
import { runningRun, startRun } from '../runs';

export const integrityRoutes: HttpHandler[] = [
  http.get(
    '*/admin/system/integrity',
    route({ gate: 'integrity' }, ({ state }) => HttpResponse.json<IntegrityReport>(buildIntegrity(state))),
  ),

  http.post(
    '*/admin/system/integrity/run',
    route({ write: 'system:manage', gate: 'integrity' }, async ({ state, now }) => {
      if (runningRun(state, 'ledger_integrity')) {
        return problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Check already running',
          'The integrity check is running now. Wait for it to finish.',
        );
      }
      return HttpResponse.json<JobRun>(await startRun(state, 'ledger_integrity', await staffRef(), now), {
        status: 202,
      });
    }),
  ),
];
