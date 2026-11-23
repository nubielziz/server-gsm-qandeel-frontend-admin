// Tests for StripTabs: a navigation landmark of links, the current kind marked with aria-current.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { StripTabs } from './StripTabs';

const items = [
  { id: 'imei', label: 'IMEI Service', to: '/products?type=imei' },
  { id: 'server', label: 'Server Service', to: '/products?type=server' },
  { id: 'remote', label: 'Remote Service', to: '/products?type=remote' },
];

function renderStrip(current: string) {
  return render(
    <MemoryRouter>
      <StripTabs items={items} current={current} ariaLabel="Kind of service" />
    </MemoryRouter>,
  );
}

describe('StripTabs', () => {
  it('is a navigation landmark of links, each with the address of its kind', () => {
    renderStrip('imei');
    expect(screen.getByRole('navigation', { name: 'Kind of service' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Server Service' })).toHaveAttribute(
      'href',
      '/products?type=server',
    );
  });

  it('marks only the current kind with aria-current', () => {
    renderStrip('server');
    expect(screen.getByRole('link', { name: 'Server Service' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'IMEI Service' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Remote Service' })).not.toHaveAttribute('aria-current');
  });

  it('marks nothing when the current id is not in the list', () => {
    renderStrip('file');
    expect(document.querySelector('[aria-current]')).toBeNull();
  });
});
