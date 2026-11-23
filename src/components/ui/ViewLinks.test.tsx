// Tests for ViewLinks: links with aria-current, the "+" of an add link, and the divider that sets a group apart.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ViewLinks, type ViewLinkItem } from './ViewLinks';

const items: ViewLinkItem[] = [
  { id: 'all', label: 'All', to: '/products?view=all' },
  { id: 'pricing', label: 'Pricing', to: '/products?view=pricing' },
  { id: 'add', label: 'Add Service', to: '/products?view=add', add: true },
  { id: 'groups', label: 'Group', to: '/products?view=groups' },
  { id: 'add-group', label: 'Add Group', to: '/products?view=add-group', add: true, after: 'divider' },
  { id: 'rules', label: 'Price Rules', to: '/products?view=rules' },
];

function renderLinks(current: string) {
  return render(
    <MemoryRouter>
      <ViewLinks items={items} current={current} ariaLabel="Views" />
    </MemoryRouter>,
  );
}

describe('ViewLinks', () => {
  it('is a navigation landmark with one link per view', () => {
    renderLinks('all');
    expect(screen.getByRole('navigation', { name: 'Views' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/products?view=pricing');
  });

  it('marks only the active view with aria-current', () => {
    renderLinks('pricing');
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current');
  });

  it('draws the plus of an add link but keeps it out of the name', () => {
    renderLinks('all');
    const add = screen.getByRole('link', { name: 'Add Service' });
    expect(add).toHaveTextContent('+Add Service');
    expect(add.querySelector('[aria-hidden="true"]')).toHaveTextContent('+');
    expect(screen.getByRole('link', { name: 'Group' })).toHaveTextContent(/^Group$/);
  });

  it('puts a divider after the item that asks for one, hidden from assistive technology', () => {
    const { container } = renderLinks('all');
    const dividers = container.querySelectorAll('.view-links-divider');
    expect(dividers).toHaveLength(1);
    expect(dividers[0]).toHaveAttribute('aria-hidden', 'true');
    expect(dividers[0].previousElementSibling).toHaveTextContent('+Add Group');
    expect(dividers[0].nextElementSibling).toHaveTextContent('Price Rules');
    // Six list items are exposed, not seven: the divider is not one of them.
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });
});
