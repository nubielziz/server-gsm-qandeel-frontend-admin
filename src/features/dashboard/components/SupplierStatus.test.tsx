// Tests of SupplierStatus: one badge word per health reading, Disabled first, and an idle supplier neutral (M260).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SupplierHealth } from '../types';
import { SupplierStatus } from './SupplierStatus';

const supplier = (patch: Partial<SupplierHealth>): SupplierHealth => ({
  id: 1,
  name: 'Nordic GSM',
  enabled: true,
  health: 'up',
  successRate1h: null,
  p50Ms: null,
  balance: '0.0000',
  lowBalance: false,
  ...patch,
});

describe('SupplierStatus', () => {
  it.each([
    ['up', 'Healthy'],
    ['degraded', 'Degraded'],
    ['down', 'Down'],
    ['unknown', 'No recent calls'],
  ] as const)('shows %s as "%s"', (health, word) => {
    render(<SupplierStatus supplier={supplier({ health })} />);
    expect(screen.getByText(word)).toBeInTheDocument();
  });

  it('says Disabled for a disabled supplier whatever its health', () => {
    render(<SupplierStatus supplier={supplier({ enabled: false, health: 'down' })} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.queryByText('Down')).not.toBeInTheDocument();
  });

  it('never shows an idle supplier as healthy or as a fault', () => {
    render(<SupplierStatus supplier={supplier({ health: 'unknown' })} />);
    for (const word of ['Healthy', 'Degraded', 'Down'])
      expect(screen.queryByText(word)).not.toBeInTheDocument();
  });
});
