// Tests for MetaBadge: the word, tone and icon of an alert, incident, circuit, job run or integrity status.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  alertSeverityMeta,
  alertStatusMeta,
  circuitMeta,
  incidentStatusMeta,
  integrityMeta,
  jobRunMeta,
} from '../lib';
import { MetaBadge } from './MetaBadge';

describe('MetaBadge', () => {
  it('shows the word of an alert severity and status in their tones, each with an icon', () => {
    const { container } = render(
      <>
        <MetaBadge meta={alertSeverityMeta('critical')} />
        <MetaBadge meta={alertStatusMeta('firing')} />
      </>,
    );
    expect(screen.getByText('Critical').closest('.badge')).toHaveClass('b-crit');
    expect(screen.getByText('Firing').closest('.badge')).toHaveClass('b-serious');
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('shows incident, job run and integrity words', () => {
    render(
      <>
        <MetaBadge meta={incidentStatusMeta('investigating')} />
        <MetaBadge meta={jobRunMeta('failed')} />
        <MetaBadge meta={integrityMeta('unknown')} />
      </>,
    );
    expect(screen.getByText('Investigating')).toBeInTheDocument();
    expect(screen.getByText('Failed').closest('.badge')).toHaveClass('b-crit');
    expect(screen.getByText('Not checked').closest('.badge')).toHaveClass('b-neutral');
  });

  it('puts the hint of a circuit state in a tooltip', () => {
    render(<MetaBadge meta={circuitMeta('open')} />);
    expect(screen.getByText('Open').closest('[title]')).toHaveAttribute(
      'title',
      'Calls are stopped after repeated failures.',
    );
  });

  it('has no tooltip when the meta has no hint', () => {
    const { container } = render(<MetaBadge meta={alertStatusMeta('resolved')} />);
    expect(container.querySelector('[title]')).not.toBeInTheDocument();
  });
});
