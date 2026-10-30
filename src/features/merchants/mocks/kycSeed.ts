// The verification requests of the merchants mock. The demo has none (only a "Verified / In review" word on each merchant), so a
// few are made up to give the Verification tab something to show: the merchants still waiting have a pending request with two
// documents, some verified ones have an approved request, and the suspended merchant has one that was rejected.
import { toIso } from '@/mocks/seed';
import type { MockClient, MockKyc } from './store';

const DAY_MS = 86_400_000;
const REVIEWER = { id: 1, name: 'Rami K.' };

const submission = (
  index: number,
  client: MockClient,
  ago: number,
  status: MockKyc['status'],
  extra: Partial<MockKyc> = {},
): MockKyc => {
  const files = [9000 + index * 2, 9001 + index * 2];
  return {
    id: index,
    clientId: client.id,
    status,
    fileIds: files,
    files: [
      { id: files[0], filename: 'passport.jpg', mime: 'image/jpeg', size: 482_000 },
      { id: files[1], filename: 'trade-licence.pdf', mime: 'application/pdf', size: 1_240_000 },
    ],
    reviewedAt: null,
    reviewedBy: null,
    note: '',
    createdAt: toIso(Date.now() - ago * DAY_MS),
    ...extra,
  };
};

/** Requests for the pending merchants, a few approved ones for verified merchants, and a rejected one for the suspended merchant. */
export function kycRows(clients: readonly MockClient[]): MockKyc[] {
  const rows: MockKyc[] = [];
  const add = (
    client: MockClient | undefined,
    ago: number,
    status: MockKyc['status'],
    extra?: Partial<MockKyc>,
  ) => {
    if (client) rows.push(submission(rows.length + 1, client, ago, status, extra));
  };
  const approved = (ago: number): Partial<MockKyc> => ({
    reviewedAt: toIso(Date.now() - (ago - 1) * DAY_MS),
    reviewedBy: REVIEWER,
    note: 'Documents match the trade licence.',
  });
  for (const client of clients.filter((candidate) => candidate.status === 'pending'))
    add(client, 1, 'pending');
  for (const client of clients.filter((candidate) => [1, 2, 3].includes(candidate.id))) {
    add(client, 20 + client.id, 'approved', approved(20 + client.id));
  }
  add(
    clients.find((candidate) => candidate.status === 'suspended'),
    40,
    'rejected',
    {
      reviewedAt: toIso(Date.now() - 39 * DAY_MS),
      reviewedBy: REVIEWER,
      note: 'The passport photo was unreadable.',
    },
  );
  return rows;
}
