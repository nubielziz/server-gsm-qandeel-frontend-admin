// Tests for the notification template, notification log and webhook delivery API functions, run against the dev mock API.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createTemplate,
  deleteTemplate,
  getNotification,
  getTemplate,
  getWebhookDelivery,
  listNotifications,
  listTemplates,
  listWebhookDeliveries,
  previewTemplate,
  retryWebhookDelivery,
  updateTemplate,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

describe('notification templates', () => {
  it('lists the templates of one audience and channel', async () => {
    const result = await listTemplates({ filters: { audience: 'customer', channel: 'email' } });
    expect(result.total).toBe(6);
    expect(result.data[0]).toMatchObject({ event: 'order.received', locale: 'en', isActive: true });
    expect((await listTemplates({ filters: { channel: 'telegram' } })).total).toBe(1);
  });

  it('adds, changes and deletes a template', async () => {
    const created = await createTemplate({
      event: 'refund.issued',
      channel: 'email',
      audience: 'customer',
      locale: 'en',
      subject: 'Your refund',
      body: 'We refunded {{amount}}.',
      isActive: true,
    });
    expect(await getTemplate(created.id)).toMatchObject({ event: 'refund.issued' });
    expect(await updateTemplate(created.id, { isActive: false })).toMatchObject({ isActive: false });
    await deleteTemplate(created.id);
    expect((await listTemplates()).data.some((template) => template.id === created.id)).toBe(false);
  });

  it('previews the saved text, or the text sent with the request, with sample data', async () => {
    const recorder = recordRequests();
    const saved = await previewTemplate(1);
    expect(recorder.last()).toMatchObject({ method: 'POST', body: {} });
    expect(recorder.last().url.pathname).toBe('/admin/notification-templates/1/preview');
    expect(saved.subject).toBe('Your order SF-20431 is confirmed');
    expect(saved.format).toBe('text');
    const draft = await previewTemplate(1, { subject: 'Hello {{customerName}}' });
    expect(draft.subject).toBe('Hello Daniel');
  });
});

describe('the logs', () => {
  it('lists the notifications newest first with filters, and reads one with its data', async () => {
    const failed = await listNotifications({
      filters: { status: 'failed' },
      sort: ['createdAt'],
      order: ['desc'],
    });
    expect(failed.total).toBeGreaterThan(0);
    expect(failed.data.every((row) => row.status === 'failed')).toBe(true);
    const one = await getNotification(failed.data[0].id);
    expect(one.error).toBe('The mailbox does not exist.');
    expect(one.recipient).toMatch(/\*\*\*/);
  });

  it('lists the webhook deliveries and reads one with the merchant’s answer', async () => {
    const list = await listWebhookDeliveries({ start: 0, end: 5, q: 'Al-Noor' });
    expect(list.data.every((row) => row.client?.name === 'Al-Noor Telecom')).toBe(true);
    const failed = (await listWebhookDeliveries({ filters: { status: 'failed' } })).data[0];
    const detail = await getWebhookDelivery(failed.id);
    expect(detail.endpoint?.url).toMatch(/^https:\/\/hooks\./);
    expect('responseBody' in detail).toBe(true);
  });

  it('sends a failed delivery again and is refused for one that worked', async () => {
    const failed = (await listWebhookDeliveries({ filters: { status: 'failed' } })).data[0];
    const queued = await retryWebhookDelivery(failed.id);
    expect(queued).toMatchObject({ status: 'pending', attempt: failed.attempt + 1 });
    const delivered = (await listWebhookDeliveries({ filters: { status: 'delivered' } })).data[0];
    await expect(retryWebhookDelivery(delivered.id)).rejects.toMatchObject({
      status: 409,
      code: 'DELIVERY_SUCCEEDED',
    });
  });
});
