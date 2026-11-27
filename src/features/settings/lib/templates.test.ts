// Tests for the template texts, the proof-email check and the safe preview document.
import { describe, expect, it } from 'vitest';
import type { NotificationTemplate } from '../types';
import {
  channelLabel,
  eventLabel,
  eventOptions,
  eventsOf,
  TEMPLATE_EVENTS,
  isHtmlPreview,
  isProofEmail,
  previewDocument,
  templateMeta,
} from './templates';

const template = (patch: Partial<NotificationTemplate>): NotificationTemplate => ({
  id: 1,
  event: 'order.received',
  channel: 'email',
  audience: 'customer',
  subject: 'Hello',
  body: 'Body',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('texts', () => {
  it('turns an event key into words', () => {
    expect(eventLabel('order.completed')).toBe('Order completed');
    expect(eventLabel('payment.failed')).toBe('Payment failed');
    expect(eventLabel('wallet_low_balance')).toBe('Wallet low balance');
  });

  it('describes who gets it and where', () => {
    expect(templateMeta(template({}))).toBe('Customer · Email');
    expect(templateMeta(template({ audience: 'merchant' }))).toBe('Merchant · Email');
  });

  it('shows the word of a channel it does not know as it was stored', () => {
    expect(channelLabel('email')).toBe('Email');
    expect(channelLabel('telegram')).toBe('telegram');
  });
});

describe('isProofEmail', () => {
  it('asks only for the customer’s receipt, result and failure emails', () => {
    expect(isProofEmail(template({}))).toBe(true);
    expect(isProofEmail(template({ event: 'order.failed' }))).toBe(true);
    expect(isProofEmail(template({ event: 'support.reply' }))).toBe(false);
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

describe('the event menu', () => {
  it('lists the events of each audience, as the backend registers them, each key once and in lower case with dots', () => {
    for (const [audience, keys] of Object.entries(TEMPLATE_EVENTS)) {
      expect(keys.length, audience).toBeGreaterThan(2);
      expect(new Set(keys).size, audience).toBe(keys.length);
      expect(
        keys.every((key) => /^[a-z]+(\.[a-z_]+)+$/.test(key)),
        audience,
      ).toBe(true);
    }
    // The same key may exist for two audiences, each with its own texts.
    expect(TEMPLATE_EVENTS.customer).toContain('order.completed');
    expect(TEMPLATE_EVENTS.merchant).toContain('order.completed');
    expect(eventsOf('staff')).toContain('alert.fired');
    expect(eventsOf('robot')).toEqual([]);
  });

  it('has every event the backend registers a template for, by audience (support, wallet, platform and identity files)', () => {
    // The backend's registry: notification-events.ts (BUILT_IN_EVENTS), identity-mail-events.ts, support-events.ts and
    // customer-wallet-notifications.ts. broadcast-events.ts is left out: its events have no template.
    expect([...TEMPLATE_EVENTS.customer].sort()).toEqual(
      [
        'order.received',
        'order.completed',
        'order.failed',
        'support.reply',
        'support.ticket_received',
        'payment.failed',
        'refund.declined',
        'wallet.topup_credited',
        'wallet.topup_rejected',
        'wallet.adjusted',
        'wallet.frozen',
        'wallet.order_refunded',
        'customer.magic_link',
        'customer.password_reset',
        'customer.invited',
        'customer.email_verification',
        'customer.security_notice',
      ].sort(),
    );
    expect([...TEMPLATE_EVENTS.merchant].sort()).toEqual(
      [
        'merchant.email_verification',
        'merchant.password_reset',
        'merchant.invited',
        'wallet.low_balance',
        'service.price_changed',
        'invoice.paid',
        'order.completed',
        'order.failed',
        'support.reply',
        'support.ticket_received',
        'merchant.suspended',
        'merchant.reactivated',
        'merchant.security_notice',
        'merchant.portal_api_key_created',
      ].sort(),
    );
    expect([...TEMPLATE_EVENTS.staff].sort()).toEqual(
      [
        'alert.fired',
        'alert.resolved',
        'retail.prices_followed',
        'staff.invited',
        'staff.password_reset',
      ].sort(),
    );
    expect(Object.values(TEMPLATE_EVENTS).flat()).not.toContain('broadcast.announcement');
  });

  it('asks for a choice first, then writes each event in words, sorted by those words', () => {
    const options = eventOptions('customer');
    expect(options[0]).toEqual({ value: '', label: 'Choose an event…' });
    expect(options).toContainEqual({ value: 'order.received', label: 'Order received' });
    const labels = options.slice(1).map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(options).toHaveLength(TEMPLATE_EVENTS.customer.length + 1);
  });

  it('keeps a saved event the list does not know in the menu, in words, and does not repeat a known one', () => {
    expect(eventOptions('customer', 'refund.issued')).toContainEqual({
      value: 'refund.issued',
      label: 'Refund issued',
    });
    expect(eventOptions('customer', 'order.received')).toHaveLength(TEMPLATE_EVENTS.customer.length + 1);
    expect(eventOptions('merchant', '').some((option) => option.value === 'refund.issued')).toBe(false);
  });
});
