// Tests for ActionButton: hidden for a read-only staff member, disabled with the reason when its one permission is missing,
// and an ordinary button otherwise.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { hookKit } from '../test/testKit';
import { ActionButton, type ActionButtonProps } from './ActionButton';

function renderButton(permissions: string[], props: Partial<ActionButtonProps> = {}) {
  const { Wrapper } = hookKit({ permissions });
  return render(
    <ActionButton permission="system:manage" {...props}>
      Pause queue
    </ActionButton>,
    { wrapper: Wrapper },
  );
}

describe('ActionButton', () => {
  it('is an ordinary button for a staff member who holds the permission, and runs its handler', async () => {
    const onClick = vi.fn();
    renderButton(['system:read', 'system:manage'], { onClick });
    const button = await screen.findByRole('button', { name: 'Pause queue' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-describedby');
    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('holds an area grant such as system:* as holding the permission', async () => {
    renderButton(['system:*']);
    expect(await screen.findByRole('button', { name: 'Pause queue' })).toBeEnabled();
  });

  it('draws nothing for a read-only staff member: no write permission at all', async () => {
    renderButton(['system:read', 'alerts:read', 'incidents:read']);
    // Wait for the staff member to load: the button must still be absent afterwards.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/You need the/)).not.toBeInTheDocument();
  });

  it('draws nothing while the staff member is still loading, so the button never flashes in and out', async () => {
    renderButton(['system:manage']);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Pause queue' })).toBeEnabled();
  });

  it('is disabled when another write permission is held but not this one, and names the missing permission', async () => {
    const onClick = vi.fn();
    renderButton(['system:read', 'alerts:update'], { onClick });
    const button = await screen.findByRole('button', { name: 'Pause queue' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the system:manage permission');
    // The reason is also the button's description, so a screen reader hears it.
    expect(button).toHaveAccessibleDescription('You need the system:manage permission');
    // A disabled button takes no hover, so the wrapper carries the tooltip too.
    expect(button.parentElement).toHaveAttribute('title', 'You need the system:manage permission');
    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps the caller title and disabled state when the permission is held', async () => {
    renderButton(['system:manage'], { title: 'Stops the workers', disabled: true });
    const button = await screen.findByRole('button', { name: 'Pause queue' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Stops the workers');
  });

  it('passes the button style through, and shows busy while it works', async () => {
    renderButton(['system:manage'], { variant: 'danger', loading: true });
    const button = await screen.findByRole('button', { name: 'Pause queue' });
    expect(button).toHaveClass('btn-danger');
    expect(button).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(button).toBeDisabled());
  });
});
