// Tests for PartsLayout: the menu of a record's parts (links, aria-current, counts, back link) and the part beside it, in a column of its own.
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PartsLayout, type PartsLayoutProps } from './PartsLayout';

const items = [
  { id: 'overview', label: 'Overview', to: '/products?view=edit&id=7&part=overview' },
  { id: 'pricing', label: 'Set Pricing', to: '/products?view=edit&id=7&part=pricing' },
  { id: 'inventory', label: 'Inventory', to: '/products?view=edit&id=7&part=inventory', count: 12 },
];

function renderParts(props: Partial<PartsLayoutProps> = {}) {
  return render(
    <MemoryRouter>
      <PartsLayout title="Unlock Tool 3 Months" items={items} current="pricing" {...props}>
        <p>The chosen part</p>
      </PartsLayout>
    </MemoryRouter>,
  );
}

describe('PartsLayout', () => {
  it('shows the record as an h2, its second line, and the chosen part on the right', () => {
    renderParts({ sub: '#207' });
    expect(screen.getByRole('heading', { level: 2, name: 'Unlock Tool 3 Months' })).toBeInTheDocument();
    expect(screen.getByText('#207')).toBeInTheDocument();
    expect(screen.getByText('The chosen part')).toBeInTheDocument();
  });

  it('draws the parts as a navigation landmark of links, named Parts by default', () => {
    renderParts();
    const nav = screen.getByRole('navigation', { name: 'Parts' });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/products?view=edit&id=7&part=overview',
    );
  });

  it('marks only the current part with aria-current', () => {
    renderParts();
    expect(screen.getByRole('link', { name: 'Set Pricing' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('draws a neutral count after the label and takes a name for the menu', () => {
    renderParts({ menuLabel: 'Parts of this service' });
    const nav = screen.getByRole('navigation', { name: 'Parts of this service' });
    expect(within(nav).getByRole('link', { name: /^Inventory\s?12$/ })).toBeInTheDocument();
    expect(within(nav).getByText('12')).toHaveClass('count');
  });

  it('puts the part in a column of its own inside the layout, so a short part can fill the window under the menu', () => {
    renderParts();
    const column = screen.getByText('The chosen part').parentElement;
    expect(column).toHaveClass('parts-main');
    expect(column?.parentElement).toHaveClass('parts-layout');
    expect(column?.previousElementSibling).toHaveClass('parts-side');
  });

  it('draws the link back to the list only when asked', () => {
    const { unmount } = renderParts();
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();
    unmount();
    renderParts({ back: { label: 'Services', to: '/products?view=all' } });
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/products?view=all');
  });
});
