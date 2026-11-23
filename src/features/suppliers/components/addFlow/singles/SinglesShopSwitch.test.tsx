// Tests for the switch "Prepare them for the shop": what it does when it can be turned on, and the reason it shows when it cannot.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { storefrontPricingPath } from '@/features/storefront';
import type { ShopSwitchState } from '../../../hooks/useSinglesShopRule';
import { SinglesShopSwitch } from './SinglesShopSwitch';

function show(options: { on?: boolean; shop?: ShopSwitchState; fixed?: boolean }) {
  const onChange = vi.fn();
  const onNavigate = vi.fn();
  render(
    <MemoryRouter>
      <SinglesShopSwitch
        on={options.on ?? false}
        onChange={onChange}
        shop={options.shop ?? { blocked: false, noRule: false }}
        fixed={options.fixed ?? false}
        onNavigate={onNavigate}
      />
    </MemoryRouter>,
  );
  return { onChange, onNavigate, box: screen.getByRole('switch', { name: 'Prepare them for the shop' }) };
}

describe('the shop switch', () => {
  it('turns on and off, and says nothing goes on the shop by itself', async () => {
    const { box, onChange } = show({});
    expect(box).toBeEnabled();
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Nothing goes on the shop until you review the preview/)).toBeInTheDocument();
    await userEvent.setup().click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows the permission it needs when it is held back, and stays off', () => {
    const reason = 'You need the storefront:create permission';
    const { box } = show({ on: true, shop: { blocked: true, reason, noRule: false } });
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(box).toHaveAttribute('title', reason);
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links to the shop price rules when none is switched on, and tells the flow when it is followed', async () => {
    const reason = 'No shop price rule is switched on, so no service would get a shop price.';
    const { box, onNavigate } = show({ shop: { blocked: true, reason, noRule: true } });
    expect(box).toBeDisabled();
    expect(screen.getByText(reason, { exact: false })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Open the shop price rules' });
    expect(link).toHaveAttribute('href', storefrontPricingPath());
    await userEvent.setup().click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('keeps its value once the import has begun', () => {
    const { box } = show({ on: true, fixed: true });
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-checked', 'true');
  });
});
