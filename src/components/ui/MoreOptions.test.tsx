// Tests for MoreOptions: closed at first with its inputs kept in the page, the click that opens and closes it, and the two ways it starts
// or stays open.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MoreOptions } from './MoreOptions';

const body = <input aria-label="Timeout" defaultValue="15000" />;

describe('MoreOptions', () => {
  it('starts closed, keeps its inputs in the page and opens on a click', async () => {
    const user = userEvent.setup();
    render(<MoreOptions>{body}</MoreOptions>);
    const button = screen.getByRole('button', { name: 'More options' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // Hidden, not removed: the value is still there for the form.
    expect(screen.queryByRole('textbox', { name: 'Timeout' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Timeout', { selector: 'input' })).toHaveValue('15000');

    await user.click(button);
    expect(screen.getByRole('button', { name: 'Hide more options' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('textbox', { name: 'Timeout' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Hide more options' }));
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts open with defaultOpen and can be closed', async () => {
    const user = userEvent.setup();
    render(<MoreOptions defaultOpen>{body}</MoreOptions>);
    expect(screen.getByRole('textbox', { name: 'Timeout' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Hide more options' }));
    expect(screen.queryByRole('textbox', { name: 'Timeout' })).not.toBeInTheDocument();
  });

  it('cannot be closed while forceOpen is true: it is aria-disabled, says why, and a click does nothing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MoreOptions label="Limits" forceOpen>
        {body}
      </MoreOptions>,
    );
    // The words are the ones it has when open; the button is marked disabled and its title gives the reason.
    const button = screen.getByRole('button', { name: 'Hide limits' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Open while a value here needs attention');
    await user.click(button);
    expect(screen.getByRole('textbox', { name: 'Timeout' })).toBeVisible();
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // The click was not kept: once nothing needs attention the fold is closed again, as it was chosen.
    rerender(<MoreOptions label="Limits">{body}</MoreOptions>);
    const free = screen.getByRole('button', { name: 'Limits' });
    expect(free).toHaveAttribute('aria-expanded', 'false');
    expect(free).not.toHaveAttribute('aria-disabled');
    expect(free).not.toHaveAttribute('title');
  });

  it('is not aria-disabled while it is free to open and close', () => {
    render(<MoreOptions>{body}</MoreOptions>);
    const button = screen.getByRole('button', { name: 'More options' });
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).not.toHaveAttribute('title');
  });
});
