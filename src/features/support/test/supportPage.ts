// Helpers shared by the support page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions) and
// find the list, the rows, the thread and the composer by their accessible names. Import them from tests only.
import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner, staff id 1) and makes `me` say these permissions, before the page loads. */
async function signIn(permissions?: string[]): Promise<void> {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
}

/** Opens a route of the Support page and waits for its heading. */
export async function openSupport(route = '/support', options: { permissions?: string[] } = {}) {
  await signIn(options.permissions);
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Support' }, { timeout: 10_000 });
  return app;
}

/** The ticket list, once it has loaded. */
export async function ticketList() {
  return within(await screen.findByRole('list', { name: 'Tickets' }, { timeout: 10_000 }));
}

/** The subjects of the tickets in the list, top to bottom, once the list has loaded. */
export async function subjects(): Promise<string[]> {
  const list = await ticketList();
  return list.getAllByRole('button').map((button) => button.querySelector('p')?.textContent ?? '');
}

/** The list row (a button) that holds some text. */
export async function ticketRow(text: string | RegExp) {
  const row = (await ticketList()).getByText(text).closest('button');
  if (!row) throw new Error(`No ticket row holds "${String(text)}".`);
  return within(row);
}

/** The open thread's title, once it shows. */
export const threadTitle = (name: string | RegExp) =>
  screen.findByRole('heading', { level: 2, name }, { timeout: 10_000 });

/** The figures strip. */
export const figures = () => within(screen.getByRole('region', { name: 'Support figures' }));

/** The text of the filter that is pressed in a segmented group. */
export const pressed = (group: string) =>
  within(screen.getByRole('group', { name: group }))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent);

/** Waits until the list shows exactly these subjects (a filter or search has been applied). */
export async function waitForSubjects(expected: string[]) {
  await waitFor(async () => expect(await subjects()).toEqual(expected));
}

/** The conversation of the open thread, once it has loaded. */
export const conversation = async () =>
  within(await screen.findByRole('log', { name: 'Conversation' }, { timeout: 10_000 }));

/** The reply box (or the note box while "Internal note" is on), once the thread has loaded. */
export const composerBox = (name: 'Reply' | 'Internal note' = 'Reply') =>
  screen.findByRole('textbox', { name }, { timeout: 10_000 });

/** The priority, assignee and reply-template selects of the open thread. */
export const priorityBox = () => screen.findByRole('combobox', { name: 'Priority' }, { timeout: 10_000 });
export const assigneeBox = () => screen.findByRole('combobox', { name: 'Assignee' }, { timeout: 10_000 });
export const templateBox = () =>
  screen.findByRole('combobox', { name: 'Reply templates' }, { timeout: 10_000 });

/** The labels of a select's options. */
export const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
