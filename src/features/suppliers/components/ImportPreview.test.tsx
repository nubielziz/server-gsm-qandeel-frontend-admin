// Tests for the import preview table: the summary counts every item, the table draws only the first 200 rows and says how many
// it leaves out, and a short list shows whole.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ImportPreviewItem } from '../types';
import { ImportPreview } from './ImportPreview';

const item = (id: number, state: ImportPreviewItem['state']): ImportPreviewItem => ({
  supplierServiceId: id,
  name: `Service ${id}`,
  type: 'imei',
  state,
  serviceId: null,
  serviceName: null,
  cost: '2.0000',
  previousCost: null,
  suggestedPrice: state === 'matching' ? null : '3.2000',
  minQty: 1,
  maxQty: 1,
  qtyOptions: [],
  quantityDiffers: false,
});

describe('the preview of a long list', () => {
  it('adds up all items, draws the first 200 rows, and says how many more there are', () => {
    const items = Array.from({ length: 1_203 }, (_, index) =>
      item(index + 1, index < 1_000 ? 'new' : index < 1_200 ? 'changed' : 'matching'),
    );
    render(<ImportPreview items={items} />);
    expect(screen.getByText('1,000 new, 200 with a changed cost, 3 already match.')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Import preview' }));
    expect(table.getAllByRole('row')).toHaveLength(201); // the header and 200 rows
    expect(table.getByText('Service 1')).toBeInTheDocument();
    expect(table.getByText('Service 200')).toBeInTheDocument();
    expect(table.queryByText('Service 201')).not.toBeInTheDocument();
    expect(screen.getByText('and 1,003 more')).toBeInTheDocument();
  });

  it('shows a short list whole, with no line about more', () => {
    render(<ImportPreview items={[item(1, 'new'), item(2, 'matching')]} />);
    expect(within(screen.getByRole('table', { name: 'Import preview' })).getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it('shows exactly 200 rows whole, with no line about more', () => {
    render(<ImportPreview items={Array.from({ length: 200 }, (_, index) => item(index + 1, 'new'))} />);
    expect(within(screen.getByRole('table', { name: 'Import preview' })).getAllByRole('row')).toHaveLength(
      201,
    );
    expect(screen.queryByText(/^and .* more$/)).not.toBeInTheDocument();
  });
});
