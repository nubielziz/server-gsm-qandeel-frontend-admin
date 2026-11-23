// Tests for YesNo: the switch role, both words shown, the flip on click and keyboard, the disabled state and the label tie.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { YesNo } from './YesNo';

function Harness({
  initial = false,
  onChange = () => {},
  ...rest
}: {
  initial?: boolean;
  onChange?: (value: boolean) => void;
  yes?: string;
  no?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <YesNo
      value={value}
      aria-label="Send For Verification"
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      {...rest}
    />
  );
}

describe('YesNo', () => {
  it('is a switch that reports its state, with both words drawn', () => {
    const { rerender } = render(<YesNo value={true} onChange={() => {}} aria-label="Status" />);
    const toggle = screen.getByRole('switch', { name: 'Status' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveTextContent('Yes');
    expect(toggle).toHaveTextContent('No');
    rerender(<YesNo value={false} onChange={() => {}} aria-label="Status" />);
    expect(screen.getByRole('switch', { name: 'Status' })).toHaveAttribute('aria-checked', 'false');
  });

  it('flips on click and reports the next value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Send For Verification' });
    await user.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('flips with the space bar and the enter key', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'Send For Verification' });
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the words it is given', () => {
    render(<Harness yes="Active" no="Inactive" />);
    const toggle = screen.getByRole('switch', { name: 'Send For Verification' });
    expect(toggle).toHaveTextContent('Active');
    expect(toggle).toHaveTextContent('Inactive');
  });

  it('does nothing when disabled, and carries its title', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness disabled title="Switched off while the service is on the shop" onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Send For Verification' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('title', 'Switched off while the service is on the shop');
    await user.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is named by a label tied to its id', () => {
    render(
      <>
        <label htmlFor="verify">Send For Verification</label>
        <YesNo id="verify" value={false} onChange={() => {}} />
      </>,
    );
    expect(screen.getByRole('switch', { name: 'Send For Verification' })).toHaveAttribute('id', 'verify');
  });
});
