// Tests for the mock seed (plan section 11): the three campaigns with the backend seed's ids and names, the inbox of five items with two read, and the made-up
// audience agreeing with itself (the live count, the fan-out and the delivery numbers are counted from the same people).
import { describe, expect, it } from 'vitest';
import { eligiblePeople, MOCK_AUDIENCE, previewOf } from './audience';
import { deliveryOf, fanOut } from './rows';
import { seedCampaigns, seedInbox } from './seed';

const NOW = Date.parse('2026-11-10T09:00:00.000Z');

describe('the campaigns', () => {
  const { items } = seedCampaigns(NOW);
  const [first, second, third] = items.map((item) => item.campaign);

  it('are the three of the backend seed, with its ids and names', () => {
    expect(items.map((item) => [item.campaign.id, item.campaign.name, item.campaign.status])).toEqual([
      [1, 'Scheduled maintenance on Friday', 'sent'],
      [2, 'Ramadan offer', 'scheduled'],
      [3, 'New unlock services', 'draft'],
    ]);
    expect([first.purpose, second.purpose, third.purpose]).toEqual(['service', 'marketing', 'service']);
    expect([first.channels, second.channels, third.channels]).toEqual([
      ['in_app', 'email'],
      ['email'],
      ['in_app'],
    ]);
  });

  it('write English and Arabic', () => {
    for (const { campaign } of items) {
      expect(campaign.content.en.title).toBeTruthy();
      expect(campaign.content.ar?.title).toBeTruthy();
    }
  });

  it('schedule the second one 7 days after the seed time', () => {
    expect(second.scheduledAt).toBe(new Date(NOW + 7 * 24 * 3_600_000).toISOString());
  });

  it('count the sent campaign from its rows', () => {
    const rows = items[0].rows;
    expect(first.recipients).toBe(new Set(rows.map((row) => `${row.recipientType}:${row.recipientId}`)).size);
    expect(first.planned.inApp + first.planned.email).toBe(rows.length);
    expect(first.delivery).toEqual(deliveryOf(rows));
    expect(first.expectedRecipients).toBe(first.recipients);
    // The second and third have no rows yet.
    expect(items[1].rows).toEqual([]);
    expect(second.expectedRecipients).toBeGreaterThan(0);
    expect(third.expectedRecipients).toBeNull();
  });
});

describe('the inbox', () => {
  const items = seedInbox(NOW);

  it("has five items, newest first by id, two unread, and campaign 1's in-app item among them", () => {
    expect(items.map((item) => item.id)).toEqual([5, 4, 3, 2, 1]);
    expect(items.filter((item) => item.readAt === null)).toHaveLength(2);
    expect(items.find((item) => item.campaignId === 1)?.title).toBe('Scheduled maintenance on Friday');
    const times = items.map((item) => Date.parse(item.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('has an Arabic item and a link a console page can open', () => {
    expect(items.some((item) => item.locale === 'ar')).toBe(true);
    expect(items.find((item) => item.link)?.link).toMatch(/^\//);
  });
});

describe('the made-up audience', () => {
  it('has the sizes it says it has', () => {
    const everyone = eligiblePeople(
      { staff: {}, merchants: { statuses: ['active', 'pending'] }, customers: {} },
      'service',
    );
    expect(everyone.people.filter((p) => p.type === 'staff')).toHaveLength(MOCK_AUDIENCE.staff);
    expect(everyone.people.filter((p) => p.type === 'client')).toHaveLength(MOCK_AUDIENCE.merchants);
    expect(everyone.people.filter((p) => p.type === 'customer')).toHaveLength(MOCK_AUDIENCE.customers);
  });

  it('counts the same people in the preview and in the fan-out, for a matrix of specs', () => {
    const specs = [
      { staff: {} },
      { merchants: { groupIds: [1] } },
      { customers: { hasAccount: false } },
      {
        staff: { roleIds: [1, 2] },
        include: [{ type: 'client' as const, id: 3 }],
        exclude: [{ type: 'staff' as const, id: 1 }],
      },
      { customers: { locales: ['ar' as const] }, merchants: { countries: ['JO'] } },
    ];
    for (const spec of specs) {
      for (const channels of [['in_app'], ['email'], ['in_app', 'email', 'telegram']] as const) {
        for (const purpose of ['service', 'marketing'] as const) {
          const preview = previewOf(spec, channels, purpose);
          const made = fanOut({ audience: spec, purpose, channels: [...channels] }, 'done', NOW, 1);
          expect(made.recipients).toBe(preview.reachable);
          expect(made.planned.inApp).toBe(preview.byChannel.inApp);
          expect(made.planned.email).toBe(preview.byChannel.email);
          expect(made.planned.telegram).toBe(preview.byChannel.telegram);
        }
      }
    }
  });

  it('drops customers who did not agree when the purpose is marketing, and says how many', () => {
    const service = previewOf({ customers: {} }, ['email'], 'service');
    const marketing = previewOf({ customers: {} }, ['email'], 'marketing');
    expect(marketing.total).toBeLessThan(service.total);
    expect(marketing.excluded.noConsent).toBe(service.total - marketing.total);
  });

  it('reaches by Telegram only merchants with a chat, and counts the others as not reached', () => {
    const preview = previewOf({ merchants: {}, staff: {} }, ['telegram'], 'service');
    expect(preview.byType.staff).toBe(0);
    expect(preview.excluded.noTelegram).toBeGreaterThan(0);
    expect(preview.reachable).toBe(preview.byChannel.telegram);
  });
});
