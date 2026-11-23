// Helpers shared by the Add-from-supplier form tests: open the form on its own (signed in as the Owner, or with fewer permissions), choose a
// supplier and a way in, and find the Add button. Tests install the feature's mocks themselves (`mockServer.use(...mocks.handlers)`): lint keeps
// MSW out of helper files. They use createElement because this file holds functions, not components. Import them from tests only.
import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';
import { Route } from 'react-router';
import type { ServiceType } from '@/lib/serviceTypes';
import { mockMe, renderShell, signInAs } from '@/test/renderApp';
import type { AddInitial } from '../components/addFromSupplier/lib/addRules';
import { AddFromSupplierProbe } from './AddFromSupplierProbe';

export type User = ReturnType<typeof userEvent.setup>;

/**
 * Signs in and mounts the form for a kind (IMEI unless said) and waits for its Supplier menu; `permissions` changes what `me` says first,
 * `header` is what the host puts above the rows.
 */
export async function openForm(
  options: { type?: ServiceType; initial?: AddInitial; permissions?: string[]; header?: ReactNode } = {},
) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const view = renderShell(
    '/probe',
    createElement(Route, {
      path: '/probe',
      element: createElement(AddFromSupplierProbe, {
        type: options.type ?? 'imei',
        initial: options.initial,
        header: options.header,
      }),
    }),
  );
  await screen.findByRole('combobox', { name: 'Supplier' }, { timeout: 10_000 });
  return view;
}

/** Picks a supplier in the Supplier menu once the list has loaded. */
export async function chooseSupplier(user: User, name: string) {
  const menu = screen.getByRole('combobox', { name: 'Supplier' });
  await within(menu).findByRole('option', { name });
  await user.selectOptions(menu, name);
}

/** Sets the Add switch to whole groups or single services. */
export async function chooseWay(user: User, way: 'groups' | 'services') {
  const toggle = screen.getByRole('switch', { name: 'Add' });
  if ((toggle.getAttribute('aria-checked') === 'true') !== (way === 'groups')) await user.click(toggle);
}

/** The Add button of the pinned bar, whatever it says while a long list goes ("Adding 500 of 603…", "Continue adding (103 left)"). */
export const addButton = () => screen.getByRole('button', { name: /^(Add|Adding .*|Continue adding .*)$/ });

/** The text of the cells of the row that holds `name`. */
export const cellsOf = (table: ReturnType<typeof within>, name: string) =>
  within(table.getByText(name).closest('tr') as HTMLElement)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
