// ServiceCells: the Type, Service Name and Input columns of the Orders table (decision 037).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import { InputCell, ServiceNameCell, TypeCell } from './ServiceCells';

const LONG_NAME =
  'Apple iPhone Unlock Worldwide Clean and Blacklisted IMEI, All Carriers, Premium Fast Lane (1-24 hours)';

describe('TypeCell', () => {
  it('shows the kind of service as the kit tag', () => {
    render(
      <TypeCell order={order({ service: { id: 9, name: 'Remote tool', type: 'remote', slaMinutes: 60 } })} />,
    );
    expect(screen.getByText('Remote')).toHaveClass('tag');
  });
});

describe('ServiceNameCell', () => {
  it('shows the whole name and never cuts it off', () => {
    render(
      <ServiceNameCell
        order={order({ service: { id: 6, name: LONG_NAME, type: 'imei', slaMinutes: 120, category: null } })}
      />,
    );
    const name = screen.getByText(LONG_NAME);
    expect(name).toBeInTheDocument();
    expect(name.className).not.toMatch(/truncate|line-clamp|max-w/);
  });
});

describe('InputCell', () => {
  it('groups an IMEI in the mono face and shows no quantity for one unit', () => {
    render(<InputCell order={order({ imei: '354607116588777', quantity: 1 })} />);
    expect(screen.getByText('35 460711 658877 7')).toHaveClass('mono');
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it('shows the quantity after the input when the order has more than one unit', () => {
    render(<InputCell order={order({ imei: '354607116588777', quantity: 3 })} />);
    expect(screen.getByText('×3')).toBeInTheDocument();
    expect(screen.getByText('35 460711 658877 7')).toBeInTheDocument();
  });

  it('shows an input that is not an IMEI as it is, with its whole text in the tooltip', () => {
    render(<InputCell order={order({ imei: 'maya.haddad@example.com' })} />);
    expect(screen.getByText('maya.haddad@example.com')).toHaveAttribute('title', 'maya.haddad@example.com');
  });

  it('shows a dash for an order with no main input', () => {
    render(<InputCell order={order({ imei: '' })} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });
});
