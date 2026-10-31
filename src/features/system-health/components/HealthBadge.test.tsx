// Tests for HealthBadge: every status has a word and an icon, no data stays neutral, and the word can be replaced.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HealthStatus } from '../lib';
import { HealthBadge } from './HealthBadge';

const WORDS: Array<[HealthStatus, string, string]> = [
  ['operational', 'Operational', 'b-good'],
  ['ok', 'OK', 'b-good'],
  ['degraded', 'Degraded', 'b-warn'],
  ['warn', 'Warn', 'b-warn'],
  ['outage', 'Outage', 'b-crit'],
  ['down', 'Down', 'b-crit'],
  ['crit', 'Critical', 'b-crit'],
  ['paused', 'Paused', 'b-neutral'],
  ['unknown', 'Unknown', 'b-neutral'],
];

describe('HealthBadge', () => {
  it.each(WORDS)('shows %s as the word %s in its tone', (status, word, toneClass) => {
    const { container } = render(<HealthBadge status={status} />);
    const badge = screen.getByText(word).closest('.badge');
    expect(badge).toHaveClass(toneClass);
    // Status is never colour alone: the word comes with an icon.
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('can show a better word than the default, in the same tone', () => {
    render(<HealthBadge status="unknown" label="Monitoring unavailable" />);
    expect(screen.getByText('Monitoring unavailable').closest('.badge')).toHaveClass('b-neutral');
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('keeps a status it does not know neutral, with the raw text', () => {
    render(<HealthBadge status={'exploding' as HealthStatus} />);
    expect(screen.getByText('exploding').closest('.badge')).toHaveClass('b-neutral');
  });
});
