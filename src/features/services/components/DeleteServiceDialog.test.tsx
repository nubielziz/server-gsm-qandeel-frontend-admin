// Tests for the Delete service dialog mounted on its own, against the dev mock API: it hands back the service it deleted, shows the server's
// refusal for a service that has orders and keeps it, and deletes a service nobody ordered.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, getService } from '../api';
import { CLOSED_TEXT, mountDialog, serviceNamed } from '../test/dialogHost';
import type { Service } from '../types';
import { DeleteServiceDialog } from './DeleteServiceDialog';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** Makes a service nobody ordered (a code of its own per test). */
async function temporary(code: string) {
  return createService({
    name: 'Temporary Check',
    code,
    categoryId: 1,
    type: 'imei',
    slaMinutes: 5,
    basePrice: '1.0000',
  });
}

/** Opens the dialog for a service of the list, signed in as the Owner; `onDeleted` is what the host would untick. */
async function openDelete(name: string, onDeleted?: (service: Service) => void) {
  const service = await serviceNamed(name);
  mountDialog((close) => <DeleteServiceDialog service={service} onClose={close} onDeleted={onDeleted} />);
  return within(await screen.findByRole('dialog', { name: `Delete ${name}?` }));
}

describe('Delete', () => {
  it('hands back the service it deleted, so the host can untick it', async () => {
    const user = userEvent.setup();
    await signInAs();
    const made = await temporary('TMP-2');
    const onDeleted = vi.fn();
    const dialog = await openDelete('Temporary Check', onDeleted);
    await user.click(dialog.getByRole('button', { name: 'Delete service' }));
    expect(await screen.findByText('Temporary Check deleted')).toBeInTheDocument();
    expect(onDeleted).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: made.id }));
    expect(await screen.findByText(CLOSED_TEXT)).toBeInTheDocument();
  });

  it('shows the server’s refusal for a service that has orders and keeps it', async () => {
    const user = userEvent.setup();
    await signInAs();
    const onDeleted = vi.fn();
    const dialog = await openDelete('Z3X Credits x10', onDeleted);
    await user.click(dialog.getByRole('button', { name: 'Delete service' }));
    expect(
      await dialog.findByText('Z3X Credits x10 has 38 orders, so it cannot be deleted. Disable it instead.'),
    ).toBeInTheDocument();
    expect((await getService(15)).name).toBe('Z3X Credits x10');
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes a service nobody ordered', async () => {
    const user = userEvent.setup();
    await signInAs();
    const made = await temporary('TMP-1');
    const dialog = await openDelete('Temporary Check');
    await user.click(dialog.getByRole('button', { name: 'Delete service' }));
    expect(await screen.findByText('Temporary Check deleted')).toBeInTheDocument();
    await expect(getService(made.id)).rejects.toMatchObject({ status: 404 });
  });
});
