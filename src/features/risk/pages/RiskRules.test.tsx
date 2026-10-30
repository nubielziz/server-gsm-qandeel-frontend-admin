// Tests for the Rules tab, run through the whole app against the dev mock API: the rules and the scoring bar, saving a switch
// and a number, the client's hint that the hold line stays below the block line (nothing is sent), the server's message under
// the field, a refusal with no field, and what a missing permission disables.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getRiskRules } from '../api';
import { openRisk } from '../test/riskPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

const HOLD = 'Hold orders scoring at least';
const BLOCK = 'Block orders scoring at least';
const THREE_DS = 'Require 3D Secure on card payments';

const valueOf = (label: string) => screen.findByLabelText(`Value for ${label}`);
const savedValue = async (id: string) => (await getRiskRules()).rules.find((rule) => rule.id === id)?.value;

describe('the rules', () => {
  it('lists the demo’s eight rules with their hints, numbers and units', async () => {
    await openRisk('/risk?tab=rules');
    const list = within(await screen.findByRole('region', { name: 'Rules' }));
    expect(await list.findByText(HOLD)).toBeInTheDocument();
    expect(list.getAllByRole('listitem')).toHaveLength(8);
    expect(
      list.getByText('Held orders wait in the risk queue and are not sent to a supplier.'),
    ).toBeInTheDocument();
    expect(await valueOf(HOLD)).toHaveValue('50');
    expect(await valueOf(BLOCK)).toHaveValue('80');
    expect(await valueOf('Maximum orders per email in 24 hours')).toHaveValue('3');
    expect(list.getByText('orders')).toBeInTheDocument();
    expect(list.getByText('USD')).toBeInTheDocument();
    expect(list.getByText('Same as Settings')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: `Turn off: ${THREE_DS}` })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('switch', { name: 'Turn on: Block disposable email domains' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('draws the three bands from the hold and block lines', async () => {
    await openRisk('/risk?tab=rules');
    const panel = within(await screen.findByRole('region', { name: 'How scoring works' }));
    expect(panel.getByText('0 to 49')).toBeInTheDocument();
    expect(panel.getByText('50 to 79')).toBeInTheDocument();
    expect(panel.getByText('80 and up')).toBeInTheDocument();
  });

  it('shows the server’s error with Retry', async () => {
    mockServer.use(
      http.get('*/admin/risk/rules', () => problem(400, 'BAD_REQUEST', 'Rules are down', 'Try later.')),
    );
    await openRisk('/risk?tab=rules');
    expect(await screen.findByText('Could not load the rules')).toBeInTheDocument();
  });

  it('says so when the server sends no rules', async () => {
    mockServer.use(http.get('*/admin/risk/rules', () => HttpResponse.json({ rules: [] })));
    await openRisk('/risk?tab=rules');
    expect(await screen.findByText('No rules yet')).toBeInTheDocument();
  });
});

describe('saving', () => {
  it('saves a switch at once, tells which rule changed and turns the switch’s name around', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=rules');
    await user.click(await screen.findByRole('switch', { name: `Turn off: ${THREE_DS}` }));
    expect(await screen.findByText('Rule off')).toBeInTheDocument();
    expect(screen.getAllByText(THREE_DS).length).toBeGreaterThan(1);
    expect(await screen.findByRole('switch', { name: `Turn on: ${THREE_DS}` })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect((await getRiskRules()).rules.find((rule) => rule.id === 'require3ds')?.on).toBe(false);
  });

  it('saves a number when Enter is pressed, and the scoring bar follows', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=rules');
    const field = await valueOf(HOLD);
    await user.clear(field);
    await user.type(field, '60{Enter}');
    expect(await screen.findByText('Rule updated')).toBeInTheDocument();
    expect(screen.getByText(`${HOLD}: 60 points`)).toBeInTheDocument();
    expect(await screen.findByText('60 to 79')).toBeInTheDocument();
    expect(await savedValue('reviewThreshold')).toBe(60);
  });

  it('saves a number when the field is left', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=rules');
    const field = await valueOf('Maximum orders per email in 24 hours');
    await user.clear(field);
    await user.type(field, '5');
    await user.tab();
    expect(await screen.findByText('Rule updated')).toBeInTheDocument();
    expect(await savedValue('maxOrdersPerEmail')).toBe(5);
  });

  it('sends nothing when the number has not changed', async () => {
    const user = userEvent.setup();
    let puts = 0;
    mockServer.use(
      http.put('*/admin/risk/rules', () => {
        puts += 1;
        return HttpResponse.json({ rules: [] });
      }),
    );
    await openRisk('/risk?tab=rules');
    const field = await valueOf(HOLD);
    await user.click(field);
    await user.tab();
    expect(puts).toBe(0);
  });
});

describe('hints and the server’s message', () => {
  it('hints that the hold line must stay below the block line and sends nothing', async () => {
    const user = userEvent.setup();
    let puts = 0;
    mockServer.use(
      http.put('*/admin/risk/rules', () => {
        puts += 1;
        return HttpResponse.json({ rules: [] });
      }),
    );
    await openRisk('/risk?tab=rules');
    const field = await valueOf(HOLD);
    await user.clear(field);
    await user.type(field, '90{Enter}');
    expect(
      await screen.findByText('The hold line must be below the block line. Block starts at 80.'),
    ).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    const block = await valueOf(BLOCK);
    await user.clear(block);
    await user.type(block, '40{Enter}');
    expect(
      await screen.findByText('The block line must be above the hold line. Hold starts at 50.'),
    ).toBeInTheDocument();
    expect(puts).toBe(0);
  });

  it('asks for a whole number', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=rules');
    const field = await valueOf('Maximum orders per email in 24 hours');
    await user.clear(field);
    await user.type(field, 'many{Enter}');
    expect(await screen.findByText('Enter a whole number.')).toBeInTheDocument();
  });

  it('shows the server’s 422 under the field it names and keeps what was typed', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/risk/rules', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'blockThreshold', message: 'The block threshold cannot be above 95.' },
        ]),
      ),
    );
    await openRisk('/risk?tab=rules');
    const field = await valueOf(BLOCK);
    await user.clear(field);
    await user.type(field, '99{Enter}');
    expect(await screen.findByText('The block threshold cannot be above 95.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveValue('99');
    expect(await savedValue('blockThreshold')).toBe(80);
  });

  it('toasts a refusal that names no rule', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/risk/rules', () =>
        problem(409, 'CONFLICT', 'Rules changed', 'Someone else saved the rules.'),
      ),
    );
    await openRisk('/risk?tab=rules');
    await user.click(await screen.findByRole('switch', { name: `Turn off: ${THREE_DS}` }));
    expect(await screen.findByText('Rules changed')).toBeInTheDocument();
    expect(screen.getByText(/Someone else saved the rules\./)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: `Turn off: ${THREE_DS}` })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('permissions', () => {
  it('disables every switch and number without risk:* and names the permission', async () => {
    await openRisk('/risk?tab=rules', { permissions: ['risk:read'] });
    const field = await valueOf(HOLD);
    expect(field).toBeDisabled();
    expect(field).toHaveAttribute('title', 'You need the risk:* permission');
    for (const toggle of screen.getAllByRole('switch')) expect(toggle).toBeDisabled();
  });

  it('enables them with risk:*', async () => {
    await openRisk('/risk?tab=rules', { permissions: ['risk:read', 'risk:*'] });
    expect(await valueOf(HOLD)).toBeEnabled();
    await waitFor(() => {
      for (const toggle of screen.getAllByRole('switch')) expect(toggle).toBeEnabled();
    });
  });
});
