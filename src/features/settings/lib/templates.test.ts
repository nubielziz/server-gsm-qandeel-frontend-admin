// Tests for the template texts, the proof-email check and the safe preview document.
import { describe, expect, it } from 'vitest';
import type { NotificationTemplate } from '../types';
import { eventLabel, isHtmlPreview, isProofEmail, previewDocument, templateMeta } from './templates';

const template = (patch: Partial<NotificationTemplate>): NotificationTemplate => ({
  id: 1,
  event: 'order.received',
  channel: 'email',
  audience: 'customer',
  locale: 'en',
  subject: 'Hello',
  body: 'Body',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('texts', () => {
  it('turns an event key into words', () => {
    expect(eventLabel('order.completed')).toBe('Order completed');
    expect(eventLabel('checkout.abandoned')).toBe('Checkout abandoned');
    expect(eventLabel('deposit_approved')).toBe('Deposit approved');
  });

  it('describes who gets it, where and in which language', () => {
    expect(templateMeta(template({}))).toBe('Customer · Email · en');
    expect(templateMeta(template({ audience: 'merchant', channel: 'telegram', locale: 'ar' }))).toBe(
      'Merchant · Telegram · ar',
    );
  });
});

describe('isProofEmail', () => {
  it('asks only for the customer’s receipt, result and failure emails', () => {
    expect(isProofEmail(template({}))).toBe(true);
    expect(isProofEmail(template({ event: 'order.failed' }))).toBe(true);
    expect(isProofEmail(template({ event: 'support.reply' }))).toBe(false);
    expect(isProofEmail(template({ channel: 'telegram' }))).toBe(false);
    expect(isProofEmail(template({ audience: 'merchant' }))).toBe(false);
  });
});

describe('the preview', () => {
  it('trusts the server’s format, and guesses from the markup without one', () => {
    expect(isHtmlPreview({ format: 'html', body: 'plain' })).toBe(true);
    expect(isHtmlPreview({ format: 'text', body: '<p>x</p>' })).toBe(false);
    expect(isHtmlPreview({ body: '<p>Hi</p>' })).toBe(true);
    expect(isHtmlPreview({ body: 'Hi 1 < 2 and 3 > 2' })).toBe(false);
  });

  it('wraps the HTML with a policy that allows no scripts and no connections', () => {
    const document = previewDocument('<p>Hi</p><script>alert(1)</script>');
    expect(document).toContain("default-src 'none'");
    expect(document).not.toContain('script-src');
    expect(document).toContain('<p>Hi</p>');
  });
});
