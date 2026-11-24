// Tests for the risk page, run through the whole app against the dev mock API: the three tabs and their counts, and what the
// address does, including an old address of the tab that was retired. Decisions, the blocklist and the rules have their own
// files next to this one.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { openRisk, riskTabs, tabTexts } from '../test/riskPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

describe('tabs', () => {
  it('shows three tabs, with the held count on the queue and the entries on the blocklist', async () => {
    await openRisk();
    await waitFor(() => expect(tabTexts()).toEqual(['Review queue4', 'Blocklist5', 'Rules']));
    expect(screen.getByRole('tab', { name: /Review queue/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /IMEI checks/ })).not.toBeInTheDocument();
  });

  it('keeps the chosen tab in the address, and the queue is the clean address', async () => {
    const user = userEvent.setup();
    const app = await openRisk();
    await user.click(riskTabs().getByRole('tab', { name: /Blocklist/ }));
    expect(app.location()).toBe('/risk?tab=block');
    await user.click(riskTabs().getByRole('tab', { name: /Rules/ }));
    expect(app.location()).toBe('/risk?tab=rules');
    await user.click(riskTabs().getByRole('tab', { name: /Review queue/ }));
    expect(app.location()).toBe('/risk');
  });

  it('opens the tab named in the address, and the queue for ?tab=queue', async () => {
    await openRisk('/risk?tab=block');
    expect(riskTabs().getByRole('tab', { name: /Blocklist/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('table', { name: 'Blocklist' })).toBeInTheDocument();
  });
});

describe('an old address of the retired IMEI check tab', () => {
  it('opens the review queue without an error, whatever else the address says', async () => {
    await openRisk(
      '/risk?tab=checks&kind=icloud&result=locked&q=pixel&check=9900&page=2&sort=status&dir=asc',
    );
    expect(await screen.findByRole('article', { name: 'Held order SF-20490' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Review queue/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /IMEI checks/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
  });

  it('leaves the old parameters behind when another tab is chosen', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=checks&kind=icloud&check=9900');
    await user.click(riskTabs().getByRole('tab', { name: /Blocklist/ }));
    expect(app.location()).toBe('/risk?tab=block');
    expect(await screen.findByRole('table', { name: 'Blocklist' })).toBeInTheDocument();
  });
});
