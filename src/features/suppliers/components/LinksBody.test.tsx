// Tests for the body of the supplier chain editor: the places in order, the note for an empty chain, the "Add a supplier" menu and the
// permission locks. The body holds no state, so these tests hand it the draft and watch the calls it makes.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DraftStep, EditLock } from '../lib/links';
import { LinksBody, type LinksBodyProps } from './LinksBody';

const step = (key: string, supplierId: number, supplierName: string, service: string): DraftStep => ({
  key,
  supplierId,
  supplierName,
  supplierServiceId: supplierId * 10,
  supplierServiceName: service,
});

const steps = [step('a', 3, 'Rapid IMEI', 'Lost Check'), step('b', 1, 'Nordic GSM', 'Lost Check B')];
const suppliers = [
  { id: 1, name: 'Nordic GSM' },
  { id: 2, name: 'Gulf Server Hub' },
  { id: 3, name: 'Rapid IMEI' },
];
const OPEN: EditLock = { disabled: false };
const LOCKED: EditLock = { disabled: true, title: 'You need the catalog:update permission' };

function show(props: Partial<LinksBodyProps> = {}) {
  const calls = {
    onAdd: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    onPick: vi.fn(),
    onRetrySuppliers: vi.fn(),
  };
  render(
    <LinksBody
      steps={steps}
      suppliers={suppliers}
      lock={OPEN}
      addLock={OPEN}
      suppliersStatus="ready"
      {...calls}
      {...props}
    />,
  );
  return calls;
}

describe('LinksBody', () => {
  it('lists the places in order with their role, supplier and supplier service', () => {
    show();
    const items = within(screen.getByRole('list', { name: 'Suppliers in order' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('PrimaryRapid IMEILost Check');
    expect(items[1]).toHaveTextContent('FallbackNordic GSMLost Check B');
  });

  it('says that orders wait for manual dispatch when no supplier is linked', () => {
    show({ steps: [] });
    expect(
      screen.getByText(/No supplier is linked\. Orders for this service wait for manual dispatch\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Suppliers in order' })).not.toBeInTheDocument();
  });

  it('reports a move or a removal with the place it is at, and keeps the ends from moving out', async () => {
    const user = userEvent.setup();
    const { onMove, onRemove } = show();
    expect(screen.getByRole('button', { name: 'Move Rapid IMEI up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Nordic GSM down' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Nordic GSM up' }));
    expect(onMove).toHaveBeenCalledWith(1, 0);
    await user.click(screen.getByRole('button', { name: 'Move Rapid IMEI down' }));
    expect(onMove).toHaveBeenLastCalledWith(0, 1);
    await user.click(screen.getByRole('button', { name: 'Remove Nordic GSM' }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('offers only the suppliers that are not in the chain, and adds the one chosen', async () => {
    const user = userEvent.setup();
    const { onAdd } = show();
    const menu = screen.getByLabelText('Add a supplier');
    expect(
      within(menu)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Choose a supplier…', 'Gulf Server Hub']);
    await user.selectOptions(menu, 'Gulf Server Hub');
    expect(onAdd).toHaveBeenCalledWith({ id: 2, name: 'Gulf Server Hub' });
  });

  it('says there is no other supplier when the list was read and every supplier is in the chain', () => {
    show({ suppliers: suppliers.slice(0, 1).concat(suppliers[2]) });
    const menu = screen.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('No other supplier');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says the suppliers are loading, not that there are none, while the list is read', () => {
    show({ suppliers: [], suppliersStatus: 'loading' });
    const menu = screen.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('Loading suppliers…');
    expect(screen.queryByText('No other supplier')).not.toBeInTheDocument();
  });

  it('says the list could not be read, with Retry, and never that there is no other supplier', async () => {
    const user = userEvent.setup();
    const { onRetrySuppliers } = show({ suppliers: [], suppliersStatus: 'error' });
    const menu = screen.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('Supplier list unavailable');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the supplier list.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetrySuppliers).toHaveBeenCalledTimes(1);
  });

  it('names the permission, not a loading or a failed list, when the supplier list is not asked for', () => {
    // A list that was never asked for reads "loading" or "error" from nobody: the lock explains the menu.
    show({ suppliers: [], addLock: LOCKED, suppliersStatus: 'loading' });
    const menu = screen.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(within(menu).getAllByRole('option')[0]).toHaveTextContent('Choose a supplier…');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('turns every control off with the missing permission in its title', () => {
    show({ lock: LOCKED, addLock: LOCKED });
    for (const name of [
      'Move Nordic GSM up',
      'Move Rapid IMEI down',
      'Remove Rapid IMEI',
      'Remove Nordic GSM',
    ]) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', LOCKED.title);
    }
    const menu = screen.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(menu).toHaveAttribute('title', LOCKED.title);
    // The menu is off because of the permission, not because there is nothing to add.
    expect(within(menu).getAllByRole('option')[0]).toHaveTextContent('Choose a supplier…');
  });

  it('keeps moving and removing on when only the supplier list is locked', async () => {
    const user = userEvent.setup();
    const reason = { disabled: true, title: 'You need the suppliers:read permission' };
    const { onRemove } = show({ addLock: reason, suppliers: [] });
    expect(screen.getByLabelText('Add a supplier')).toHaveAttribute('title', reason.title);
    await user.click(screen.getByRole('button', { name: 'Remove Rapid IMEI' }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
