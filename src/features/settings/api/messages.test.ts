// Tests for the notification template and notification log API functions, run against the dev mock API.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createTemplate,
  deleteTemplate,
  getNotification,
  getTemplate,
  listNotifications,
  listTemplates,
  previewTemplate,
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
    expect(result.total).toBe(5);
    expect(result.data[0]).toMatchObject({ event: 'order.received', isActive: true });
    expect((await listTemplates({ filters: { audience: 'merchant' } })).total).toBe(2);
  });

  it('adds, changes and deletes a template', async () => {
    const created = await createTemplate({
      event: 'refund.issued',
      channel: 'email',
      audience: 'customer',
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

describe('the notification log', () => {
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
});
