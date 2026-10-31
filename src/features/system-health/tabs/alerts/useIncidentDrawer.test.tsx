// Tests for the incident drawer's history: opening adds an entry, closing goes Back to the list when this tab added the
// entry, and replaces it when the drawer came from a link or a typed address. Plain router, no app around it.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useIncidentDrawer } from './useIncidentDrawer';

/** Two buttons that open and close the drawer, and the address and kind of the last navigation as text. */
function Harness() {
  const { openIncident, closeIncident } = useIncidentDrawer();
  const { pathname, search } = useLocation();
  const type = useNavigationType();
  return (
    <>
      <p data-testid="where">{`${pathname}${search}`}</p>
      <p data-testid="how">{type}</p>
      <button onClick={() => openIncident(5)}>Open</button>
      <button onClick={closeIncident}>Close</button>
    </>
  );
}

const open = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Harness />
    </MemoryRouter>,
  );

const where = () => screen.getByTestId('where').textContent;
const how = () => screen.getByTestId('how').textContent;

describe('the incident drawer history', () => {
  it('adds an entry when it opens, and goes Back to the list when it closes', async () => {
    const user = userEvent.setup();
    open('/health?tab=alerts&view=incidents');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(where()).toBe('/health?tab=alerts&view=incidents&incident=5');
    expect(how()).toBe('PUSH');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    // Back, not one more entry: Back after this leaves the page instead of stepping through a list that looks the same.
    expect(where()).toBe('/health?tab=alerts&view=incidents');
    expect(how()).toBe('POP');
  });

  it('replaces the entry when the drawer was not opened here (a link or a typed address)', async () => {
    const user = userEvent.setup();
    open('/health?tab=alerts&view=incidents&incident=5&status=all');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(where()).toBe('/health?tab=alerts&view=incidents&status=all');
    expect(how()).toBe('REPLACE');
  });

  it('can be opened again after it was closed', async () => {
    const user = userEvent.setup();
    open('/health?tab=alerts&view=incidents');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(where()).toBe('/health?tab=alerts&view=incidents&incident=5');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(where()).toBe('/health?tab=alerts&view=incidents');
    expect(how()).toBe('POP');
  });
});
