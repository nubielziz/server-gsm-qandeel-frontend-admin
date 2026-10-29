// Mock sign-in sessions: one per device the demo says an admin is signed in on, plus a few merchants on the API portal.
import { Collection } from './db';
import { demoNumericId, demoRows, loadDemoState, toIso } from './seed';

/** An admin of the demo seed (the fields the sessions use). */
type DemoAdmin = {
  id: string;
  name: string;
  email: string;
  sessions: number;
  lastLogin: number | null;
  lastIp: string | null;
};

/** A merchant of the demo seed (the fields the sessions use). */
type DemoMerchant = { id: string; name: string; email: string; ips: string[]; lastSeen: number };

/** A session as the mock keeps it; the person is stored with it, like a joined row. */
export type MockSession = {
  id: number;
  subjectType: 'staff' | 'client';
  subject: { id: number; name: string; email: string };
  ip: string;
  userAgent: string;
  lastSeenAt: string;
  expiresAt: string;
  createdAt: string;
};

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

const HOUR = 3_600_000;
const MERCHANT_SESSIONS = 3;

let store: Promise<Collection<MockSession>> | undefined;

/** The session collection, seeded on first use: `sessions` devices per admin, then three merchants. */
export function sessionStore(): Promise<Collection<MockSession>> {
  store ??= loadDemoState().then((state) => {
    const now = Date.now();
    const rows: Omit<MockSession, 'id'>[] = [];
    let agent = 0;
    for (const admin of demoRows<DemoAdmin>(state, 'admins')) {
      for (let device = 0; device < admin.sessions; device += 1) {
        const lastSeen = (admin.lastLogin ?? now) - device * 45 * 60_000;
        rows.push({
          subjectType: 'staff',
          subject: { id: demoNumericId(admin.id), name: admin.name, email: admin.email },
          ip: admin.lastIp ?? '203.0.113.200',
          userAgent: AGENTS[agent++ % AGENTS.length],
          lastSeenAt: toIso(lastSeen),
          createdAt: toIso(lastSeen - 2 * HOUR),
          expiresAt: toIso(now + (8 - device) * HOUR),
        });
      }
    }
    for (const merchant of demoRows<DemoMerchant>(state, 'merchants').slice(0, MERCHANT_SESSIONS)) {
      rows.push({
        subjectType: 'client',
        subject: { id: demoNumericId(merchant.id), name: merchant.name, email: merchant.email },
        ip: merchant.ips?.[0] ?? '203.0.113.201',
        userAgent: AGENTS[agent++ % AGENTS.length],
        lastSeenAt: toIso(merchant.lastSeen),
        createdAt: toIso(merchant.lastSeen - 3 * HOUR),
        expiresAt: toIso(now + 7 * 24 * HOUR),
      });
    }
    return new Collection(rows.map((row, index) => ({ ...row, id: index + 1 })));
  });
  return store;
}

/** Drops the collection so the next use re-seeds it (tests). */
export function resetSessionStore(): void {
  store = undefined;
}
