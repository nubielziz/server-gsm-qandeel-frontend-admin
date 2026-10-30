// Tests for the checkouts API functions, run against the feature's own mocks: each function reaches its route with the body of its
// assumed contract and reads the answer the way the screens do. The mock keeps simple state, so a send is checked by reading the list
// again. The consent rule (MISMATCHES M1) is checked through the answers, not assumed.
import { beforeEach, describe, expect, it } from 'vitest';
import { isApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { checkoutsState } from '../mocks';
import { getFunnel, listAbandonedCheckouts, recoverCheckouts } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

describe('listAbandonedCheckouts', () => {
  it('lists the seeded checkouts with the total from the header, masked emails and the consent facts', async () => {
    const { data, total } = await listAbandonedCheckouts({ start: 0, end: 5 });
    expect(total).toBe(238);
    expect(data).toHaveLength(5);
    expect(data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        serviceName: expect.any(String),
        currencyCode: expect.any(String),
        marketingConsent: expect.any(Boolean),
        canRecover: expect.any(Boolean),
      }),
    );
    for (const row of data) expect(row.email).toMatch(/^.{2}•••@/);
  });

  it('with canRecover only returns checkouts the server would email, all of them with marketing consent and no email sent', async () => {
    const { data, total } = await listAbandonedCheckouts({
      start: 0,
      end: 500,
      filters: { canRecover: true },
    });
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(238);
    for (const row of data) {
      expect(row).toMatchObject({ canRecover: true, marketingConsent: true, recoveryEmailedAt: null });
    }
  });

  it('searches the full address although the rows carry it masked', async () => {
    const { checkouts } = await checkoutsState();
    const wanted = checkouts.list()[10];
    const { data } = await listAbandonedCheckouts({ q: wanted.rawEmail });
    expect(data.map((row) => row.id)).toContain(wanted.id);
    expect(data.every((row) => row.email.includes('•••'))).toBe(true);
  });

  it('sorts by the basket and pages by row range', async () => {
    const { data } = await listAbandonedCheckouts({
      start: 0,
      end: 20,
      sort: ['grossAmount'],
      order: ['desc'],
    });
    const amounts = data.map((row) => Number(row.grossAmount));
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    const second = await listAbandonedCheckouts({
      start: 5,
      end: 10,
      sort: ['grossAmount'],
      order: ['desc'],
    });
    expect(second.data.map((row) => row.id)).toEqual(data.slice(5, 10).map((row) => row.id));
  });
});

describe('recoverCheckouts', () => {
  it('emails the ones with consent, once, and says which it left out and why', async () => {
    const { checkouts } = await checkoutsState();
    const rows = checkouts.list();
    const ready = rows.find((row) => row.canRecover);
    const noConsent = rows.find((row) => !row.marketingConsent && !row.recoveryEmailedAt);
    const emailed = rows.find((row) => row.recoveryEmailedAt && row.orderId === null);
    // A recovered checkout (paid after the email) was emailed first, so the server names the email as the reason.
    const recovered = rows.find((row) => row.orderId !== null);
    if (!ready || !noConsent || !emailed || !recovered)
      throw new Error('The seed should have every kind of checkout.');

    const first = await recoverCheckouts({
      ids: [ready.id, noConsent.id, emailed.id, recovered.id, 999_999],
    });
    expect(first.sent).toBe(1);
    expect(first.skipped).toEqual([
      { id: noConsent.id, reason: 'no_marketing_consent' },
      { id: emailed.id, reason: 'already_emailed' },
      { id: recovered.id, reason: 'already_emailed' },
      { id: 999_999, reason: 'not_found' },
    ]);

    // Once only: the same checkout is refused the second time, and it no longer offers a reminder.
    expect(await recoverCheckouts({ ids: [ready.id] })).toEqual({
      sent: 0,
      skipped: [{ id: ready.id, reason: 'already_emailed' }],
    });
    const { data } = await listAbandonedCheckouts({ q: ready.rawEmail });
    expect(data.find((row) => row.id === ready.id)).toMatchObject({ canRecover: false });
    expect(data.find((row) => row.id === ready.id)?.recoveryEmailedAt).not.toBeNull();
  });

  it('refuses an empty list with a message on the ids field', async () => {
    const error = await recoverCheckouts({ ids: [] }).catch((caught: unknown) => caught);
    expect(isApiError(error)).toBe(true);
    if (isApiError(error)) {
      expect(error.status).toBe(422);
      expect(error.fieldErrors.ids).toEqual(['Choose at least one checkout.']);
    }
  });
});

describe('getFunnel', () => {
  it('counts the four steps for the last 30 days when no period is given', async () => {
    const report = await getFunnel();
    expect(report.days).toBe(30);
    for (const count of [report.imeiChecks, report.paymentStarted, report.paid, report.delivered]) {
      expect(Number.isInteger(count)).toBe(true);
    }
    expect(report.paymentStarted).toBeGreaterThanOrEqual(report.paid);
    expect(report.paid).toBeGreaterThanOrEqual(report.delivered);
  });

  it('counts fewer people over a shorter period', async () => {
    const week = await getFunnel({ days: 7 });
    const quarter = await getFunnel({ days: 90 });
    expect(week.imeiChecks).toBeLessThanOrEqual(quarter.imeiChecks);
    expect(week.paymentStarted).toBeLessThanOrEqual(quarter.paymentStarted);
  });

  it('refuses a period the report does not offer', async () => {
    const error = await getFunnel({ days: 5 }).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(422);
  });
});
