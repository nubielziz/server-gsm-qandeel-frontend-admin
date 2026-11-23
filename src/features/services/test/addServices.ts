// A test helper for the Add services flow of the Catalog page: the way a person reaches the New service form (the header's "Add services",
// then "A service of my own"). Import it from tests only.
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Opens the New service form the way the page does now: presses "Add services" in the header, then "A service of my own" in the
 * first step of the flow, and waits for the form's dialog. The flow's dialog is the suppliers feature's, so the page under test must
 * have it joined; a test of the host alone passes its own dialog to `AddServicesHost` instead.
 */
export async function openNewServiceForm(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'Add services' }));
  const [choice] = await screen.findAllByText('A service of my own');
  await user.click(choice);
  return screen.findByRole('dialog', { name: 'New service' });
}
