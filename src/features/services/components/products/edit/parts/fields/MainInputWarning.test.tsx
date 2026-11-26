// Tests for MainInputWarning: it shows for an IMEI service whose draft has no main input, is gone once a row is the main input, and never
// shows for the other service types.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ServiceType } from '../../../../../types';
import { MainInputWarning } from './MainInputWarning';

const TEXT =
  'This IMEI service has no main input field. Buyers cannot order it in the shop until one field is marked Main input.';

describe('MainInputWarning', () => {
  it('warns when an IMEI service has no main input', () => {
    render(<MainInputWarning serviceType="imei" hasMainInput={false} />);
    expect(screen.getByRole('status')).toHaveTextContent(TEXT);
  });

  it('is hidden once a row of the draft is the main input', () => {
    const { rerender } = render(<MainInputWarning serviceType="imei" hasMainInput={false} />);
    expect(screen.getByText(TEXT)).toBeInTheDocument();
    rerender(<MainInputWarning serviceType="imei" hasMainInput />);
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });

  it.each<ServiceType>(['server', 'remote', 'file'])(
    'is hidden for a %s service, with or without a main input',
    (type) => {
      const { rerender } = render(<MainInputWarning serviceType={type} hasMainInput={false} />);
      expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
      rerender(<MainInputWarning serviceType={type} hasMainInput />);
      expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
    },
  );
});
