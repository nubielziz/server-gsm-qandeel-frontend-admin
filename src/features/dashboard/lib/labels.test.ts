// Tests for the dashboard's words: the channel and period names, and the severity badges (including a word from a newer server).
import { describe, expect, it } from 'vitest';
import { PERIOD_ITEMS, periodTag, periodWords, SCOPE_ITEMS, SCOPE_LABEL, severityLook } from './labels';

describe('channel and period', () => {
  it('names the three channels for the control and for a sentence', () => {
    expect(SCOPE_ITEMS.map((item) => item.label)).toEqual(['All', 'Merchants', 'Storefront']);
    expect(SCOPE_LABEL).toEqual({ all: 'all channels', b2b: 'merchants', b2c: 'the storefront' });
  });

  it('writes the period as a control label, a tag and a phrase', () => {
    expect(PERIOD_ITEMS.map((item) => item.label)).toEqual(['24h', '7D', '14D']);
    expect([1, 7, 14].map((days) => periodTag(days as 1 | 7 | 14))).toEqual(['24h', '7D', '14D']);
    expect([1, 7, 14].map((days) => periodWords(days as 1 | 7 | 14))).toEqual([
      '24 hours',
      '7 days',
      '14 days',
    ]);
  });
});

describe('severityLook', () => {
  it('pairs each severity with a word, a colour and an icon, and only critical is solid', () => {
    expect(severityLook('critical')).toEqual({
      word: 'Critical',
      tone: 'crit',
      icon: 'xCircle',
      solid: true,
    });
    expect(severityLook('high')).toMatchObject({
      word: 'High',
      tone: 'serious',
      icon: 'alert',
      solid: false,
    });
    expect(severityLook('medium')).toMatchObject({ word: 'Medium', tone: 'warn', icon: 'clock' });
    expect(severityLook('low')).toMatchObject({ word: 'Low', tone: 'neutral', icon: 'info' });
  });

  it('shows a word it does not know like Low, never as a property of Object', () => {
    expect(severityLook('urgent').word).toBe('Low');
    expect(severityLook('constructor').word).toBe('Low');
  });
});
