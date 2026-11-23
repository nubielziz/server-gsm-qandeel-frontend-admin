// Tests for the Catalog header: "Add services" is the one primary action (it replaces "New service"), it needs catalog:create and
// says so when it is locked, and pressing it writes `?add=new` into the address without losing the table's other state.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { ServicesHeader } from './ServicesHeader';

/** The grants of a staff member who holds exactly these permissions, in the shape `useServiceGrants` gives. */
function grantsFor(permissions: string[]): ServiceGrants {
  const can = (permission: string) => permissions.includes(permission);
  const needsAll = (...needed: string[]): { disabled: boolean; title?: string } => {
    const missing = needed.filter((permission) => !can(permission));
    return missing.length === 0
      ? { disabled: false }
      : { disabled: true, title: `You need the ${missing.join(' and ')} permission` };
  };
  return {
    me: undefined,
    ready: true,
    can,
    canAll: (needed) => needed.every(can),
    needs: (permission) => needsAll(permission),
    needsAll,
  };
}

/** Says where the router is and how it got there, so a test can read the address and whether the entry was replaced. */
function Probe() {
  const { pathname, search } = useLocation();
  const type = useNavigationType();
  return <p data-testid="location">{`${pathname}${search} ${type}`}</p>;
}

function renderHeader(permissions: string[], route = '/catalog', belowFloor: number | undefined = 0) {
  const onBulk = vi.fn();
  const onPublishRuns = vi.fn();
  render(
    <MemoryRouter initialEntries={[route]}>
      <ServicesHeader
        grants={grantsFor(permissions)}
        belowFloor={belowFloor}
        onBulk={onBulk}
        onPublishRuns={onPublishRuns}
      />
      <Probe />
    </MemoryRouter>,
  );
  return { onBulk, onPublishRuns, location: () => screen.getByTestId('location').textContent };
}

const OWNER = ['catalog:read', 'catalog:create', 'pricing:update', 'storefront:read'];

describe('the header actions', () => {
  it('has Add services as the primary action, and no New service button', () => {
    renderHeader(OWNER);
    const add = screen.getByRole('button', { name: 'Add services' });
    expect(add).toBeEnabled();
    expect(add).toHaveClass('btn-primary');
    expect(screen.queryByRole('button', { name: 'New service' })).not.toBeInTheDocument();
    // The other actions stay.
    expect(screen.getByRole('button', { name: 'Bulk price change…' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Catalog settings' })).toHaveAttribute(
      'href',
      '/catalog?view=settings',
    );
    expect(screen.getByRole('button', { name: 'More catalog actions' })).toBeInTheDocument();
  });

  it('locks Add services without catalog:create and names the permission in its title', () => {
    renderHeader(['catalog:read']);
    const add = screen.getByRole('button', { name: 'Add services' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the catalog:create permission');
    expect(screen.getByRole('button', { name: 'Bulk price change…' })).toHaveAttribute(
      'title',
      'You need the pricing:update permission',
    );
  });

  it('keeps the bulk price action on its own handler', async () => {
    const user = userEvent.setup();
    const { onBulk, location } = renderHeader(OWNER);
    await user.click(screen.getByRole('button', { name: 'Bulk price change…' }));
    expect(onBulk).toHaveBeenCalledTimes(1);
    expect(location()).toBe('/catalog POP');
  });

  it('keeps the below-floor sentence and its link to those services', () => {
    renderHeader(OWNER, '/catalog', 2);
    expect(
      screen.getByRole('link', { name: '2 services are priced below cost plus minimum profit.' }),
    ).toHaveAttribute('href', '/catalog?belowFloor=true');
  });
});

describe('pressing Add services', () => {
  it('writes add=new into the address, replacing the history entry', async () => {
    const user = userEvent.setup();
    const { location } = renderHeader(OWNER);
    await user.click(screen.getByRole('button', { name: 'Add services' }));
    expect(location()).toBe('/catalog?add=new REPLACE');
  });

  it('keeps the filters, the sort and the open service in the address', async () => {
    const user = userEvent.setup();
    const { location } = renderHeader(OWNER, '/catalog?chip=attention&q=unlock&page=2&open=7&section=prices');
    await user.click(screen.getByRole('button', { name: 'Add services' }));
    expect(location()).toBe('/catalog?chip=attention&q=unlock&page=2&open=7&section=prices&add=new REPLACE');
  });

  it('does nothing while it is locked', async () => {
    const user = userEvent.setup();
    const { location } = renderHeader(['catalog:read']);
    await user.click(screen.getByRole('button', { name: 'Add services' }));
    expect(location()).toBe('/catalog POP');
  });
});
