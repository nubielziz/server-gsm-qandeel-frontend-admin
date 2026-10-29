// Tests for the words an order is completed with: the default reply, the templates and the {input} placeholder.
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import { defaultReply, fillInput, REJECT_REASONS, REPLY_TEMPLATES } from './reply';

describe('defaultReply', () => {
  it('uses the carrier sentence for a carrier unlock', () => {
    expect(defaultReply(order())).toBe('Unlock confirmed by carrier. Insert a non-supported SIM to verify.');
  });

  it('goes by the service type for anything else', () => {
    const service = (type: 'imei' | 'server' | 'remote' | 'file') => ({
      id: 1,
      name: 'x',
      type,
      slaMinutes: 5,
      category: 'Generic',
    });
    expect(defaultReply(order({ service: service('imei') }))).toBe('Status: Clean. Carrier: unlocked.');
    expect(defaultReply(order({ service: service('server'), imei: 'acct-9' }))).toBe(
      'Delivered to acct-9. Activation takes under 2 minutes.',
    );
    expect(defaultReply(order({ service: service('remote') }))).toBe(
      'Remote session finished. Device rebooted normally.',
    );
    expect(defaultReply(order({ service: service('file') }))).toBe('File delivered. Check your downloads.');
  });
});

describe('templates and reasons', () => {
  it('start with "write my own", which leaves the text alone', () => {
    expect(REPLY_TEMPLATES[0]).toEqual({ value: 'custom', label: 'Write my own', text: '' });
    expect(REPLY_TEMPLATES.map((template) => template.value)).toEqual([
      'custom',
      'unlock',
      'info',
      'server',
      'file',
    ]);
  });

  it('puts each order’s own input where the reply says {input}', () => {
    expect(fillInput('Delivered to {input}. Done, {input}!', order({ imei: '123' }))).toBe(
      'Delivered to 123. Done, 123!',
    );
  });

  it('offer the demo’s six rejection reasons', () => {
    expect(REJECT_REASONS).toHaveLength(6);
    expect(REJECT_REASONS[0]).toBe('IMEI is blacklisted');
  });
});
