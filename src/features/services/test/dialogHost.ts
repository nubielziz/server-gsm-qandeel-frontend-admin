// Mounts one dialog of the services feature on its own, inside the shell with the real providers, so a test can drive it without a page:
// the dialog is open at once, and "The dialog is closed" shows once it asked to be closed. It uses createElement because the file holds
// functions, not components (Fast Refresh rule). The staff member must already be signed in (`signInAs`) or mocked (`mockMe`). Import
// it from tests only.
import { createElement, useState, type ReactNode } from 'react';
import { Route } from 'react-router';
import { renderShell } from '@/test/renderApp';
import { listServices } from '../api';
import type { Service } from '../types';

/** What the host shows once the dialog asked to close. */
export const CLOSED_TEXT = 'The dialog is closed';

// Holds the dialog open until it calls its `onClose`.
function Host({ dialog }: { dialog: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(true);
  return open ? dialog(() => setOpen(false)) : createElement('p', null, CLOSED_TEXT);
}

/** The row of the service with this exact name, read from the list as the dialogs get it from a view. Sign in first. */
export async function serviceNamed(name: string): Promise<Service> {
  const found = (await listServices({ q: name })).data.find((service) => service.name === name);
  if (!found) throw new Error(`No service is named "${name}".`);
  return found;
}

/** Renders `dialog(close)` at a probe route of the shell; `close` is what the dialog's `onClose` should call. */
export function mountDialog(dialog: (close: () => void) => ReactNode) {
  return renderShell(
    '/probe',
    createElement(Route, { path: '/probe', element: createElement(Host, { dialog }) }),
  );
}
