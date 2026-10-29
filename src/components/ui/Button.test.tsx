// Tests for Button, ButtonLink, Badge, Switch and StatusDot: classes, loading state and accessible names.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';
import { Icon } from './Icon';
import { StatusDot } from './StatusDot';
import { Switch } from './Switch';

describe('Button', () => {
  it('maps variants and sizes to the demo classes and never submits a form by default', () => {
    render(
      <form>
        <Button>Plain</Button>
        <Button variant="primary" size="sm">
          Save
        </Button>
        <Button variant="danger-solid">Delete</Button>
        <Button icon aria-label="Close">
          <Icon name="x" />
        </Button>
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Plain' })).toHaveClass('btn');
    expect(screen.getByRole('button', { name: 'Plain' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn', 'btn-primary', 'btn-sm');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger-solid');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('btn-icon');
  });

  it('is disabled and busy while loading, and ignores clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides the icon of an icon-only button while loading', () => {
    const { container } = render(
      <Button icon loading aria-label="Refresh">
        <Icon name="refresh" />
      </Button>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders a router link with button classes', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/orders" variant="primary">
          Open orders
        </ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Open orders' });
    expect(link).toHaveAttribute('href', '/orders');
    expect(link).toHaveClass('btn', 'btn-primary');
  });
});

describe('Badge and StatusDot', () => {
  it('always carries the word, with the icon hidden from assistive tech', () => {
    const { container } = render(
      <Badge tone="serious" icon="alert">
        Needs review
      </Badge>,
    );
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('badge', 'b-serious');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses the solid fill only for critical', () => {
    const { container, rerender } = render(
      <Badge tone="crit" solid>
        Critical
      </Badge>,
    );
    expect(container.firstElementChild).toHaveClass('b-crit-solid');
    rerender(
      <Badge tone="good" solid>
        OK
      </Badge>,
    );
    expect(container.firstElementChild).toHaveClass('b-good');
  });

  it('names a dot only when it is given a label', () => {
    const { rerender } = render(<StatusDot tone="crit" label="Past SLA" />);
    expect(screen.getByRole('img', { name: 'Past SLA' })).toBeInTheDocument();
    rerender(<StatusDot tone="crit" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('Switch', () => {
  it('toggles through aria-checked and reports the next value', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch checked={on} onChange={setOn} label="Enable Unlock Pro" />;
    }
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'Enable Unlock Pro' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
