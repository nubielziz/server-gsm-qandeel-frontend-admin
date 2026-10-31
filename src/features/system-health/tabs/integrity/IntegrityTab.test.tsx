// Tests for the Integrity tab, run through the whole app against the dev mock API: the last run and its facts, the four
// checks (problems first, passed ones folded), the findings with their link to Finance, Run check now and its dialog, the
// running state, read-only staff, and the states of a read that fails.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { freezeClock, setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';
import type { IntegrityCheck, IntegrityReport, JobRun } from '../../types';

setupHealthMocks();
// The page and the tab are lazy chunks and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const ROUTE = '/system-health?tab=integrity';
const NOTE = 'This check only reads the ledger. Fix a difference with a reversing entry in Finance.';
const FAILING_LABEL = 'Every account balance equals the sum of its lines';

/** Opens the tab and waits until its first card has the report. */
async function openTab(options: Parameters<typeof openHealthPage>[0] = {}) {
  const app = await openHealthPage({ route: ROUTE, ...options });
  const lastRun = await screen.findByRole('region', { name: 'Last run' }, SLOW);
  await within(lastRun).findByText('Result', undefined, SLOW);
  return { app, lastRun: within(lastRun) };
}

/** The Ledger checks card, once it has rows or its quiet line. */
const checksCard = async () => within(await screen.findByRole('region', { name: 'Ledger checks' }, SLOW));

/** A report for a test that needs a shape the mock scenarios do not tell. */
function reportOf(overrides: Partial<IntegrityReport> = {}): IntegrityReport {
  return { running: false, lastRun: null, lastSuccessAt: null, checks: [], ...overrides };
}

/** A check that has never been checked: unknown, with nothing found. */
const unchecked = (key: IntegrityCheck['key'], label: string): IntegrityCheck => ({
  key,
  label,
  status: 'unknown',
  count: 0,
  difference: null,
  findings: [],
});

/** A run of the integrity job that is going now (a start two minutes ago), unless the test says otherwise. */
function runOf(overrides: Partial<JobRun> = {}): JobRun {
  return {
    id: 900,
    job: 'ledger_integrity',
    startedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    finishedAt: null,
    durationMs: 0,
    processed: 0,
    trigger: 'schedule',
    status: 'running',
    error: null,
    result: null,
    triggeredBy: null,
    ...overrides,
  };
}

/** Makes `GET /admin/system/integrity` answer this report, whatever the scenario says. */
function answerWith(report: IntegrityReport) {
  mockServer.use(http.get('*/admin/system/integrity', () => HttpResponse.json(report)));
}

describe('a healthy ledger', () => {
  it('shows a passed last run, one quiet line for the four passed checks, no findings and the note', async () => {
    const { lastRun } = await openTab();
    expect(lastRun.getByText('Pass')).toBeInTheDocument();
    expect(lastRun.getByText('Scheduled')).toBeInTheDocument();
    expect(lastRun.getByText('Last success')).toBeInTheDocument();
    expect(lastRun.getByRole('button', { name: 'Run check now' })).toBeEnabled();

    const checks = await checksCard();
    expect(await checks.findByText('All 4 checks passed', undefined, SLOW)).toBeInTheDocument();
    expect(checks.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Findings' })).not.toBeInTheDocument();
    expect(screen.getByText(/^This check only reads the ledger/)).toHaveTextContent(NOTE);
  });

  it('lists the four checks with Pass, a count and a difference after Show, and folds them up again with Hide', async () => {
    const user = userEvent.setup();
    await openTab();
    const checks = await checksCard();
    await user.click(await checks.findByRole('button', { name: 'Show the passed checks' }, SLOW));

    const table = checks.getByRole('table', { name: 'Ledger checks' });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getAllByText('Pass')).toHaveLength(4);
    // The server's sentence in sans, the check's key in mono.
    expect(within(table).getByText('Every entry sums to zero')).toBeInTheDocument();
    expect(within(table).getByText('entries_balanced')).toHaveClass('mono');
    // Three checks count money (a zero difference is printed as dollars); the holds check does not.
    expect(within(table).getAllByText('$0.00')).toHaveLength(3);

    await user.click(checks.getByRole('button', { name: 'Hide the passed checks' }));
    expect(checks.queryByRole('table')).not.toBeInTheDocument();
    expect(checks.getByText('All 4 checks passed')).toBeInTheDocument();
  });
});

describe('a ledger that does not match (the maintenance scenario)', () => {
  it('shows the failed result, who ran it, the failing check first with its count and difference, and the passed ones folded', async () => {
    const { lastRun } = await openTab({ scenario: 'maintenance' });
    expect(lastRun.getByText('Fail')).toBeInTheDocument();
    expect(lastRun.getByText('Dana M.')).toBeInTheDocument();
    expect(lastRun.queryByText('None yet')).not.toBeInTheDocument();
    // "When" and "Last success" keep the dot with "ago" in a piece that never wraps inside,
    // so a phone never ends a line with a dot.
    const agos = lastRun.getAllByText(/^· .+ ago$/);
    expect(agos).toHaveLength(2);
    for (const piece of agos) expect(piece).toHaveClass('whitespace-nowrap');

    const checks = await checksCard();
    const table = await checks.findByRole('table', { name: 'Ledger checks' }, SLOW);
    const rows = within(table).getAllByRole('row');
    // The header and one row: the failing check. The three passed checks are one quiet line.
    expect(rows).toHaveLength(2);
    const failing = within(rows[1]);
    expect(failing.getByText(FAILING_LABEL)).toBeInTheDocument();
    expect(failing.getByText('Fail')).toBeInTheDocument();
    expect(failing.getByText('-$37.50')).toBeInTheDocument();
    expect(failing.getByText('1')).toBeInTheDocument();
    expect(checks.getByText('3 checks passed')).toBeInTheDocument();
  });

  it('lists the finding with its reference linked to the Finance ledger, its difference and its last entry', async () => {
    await openTab({ scenario: 'maintenance' });
    const findings = within(await screen.findByRole('region', { name: 'Findings' }, SLOW));
    expect(findings.getByText('1 finding')).toBeInTheDocument();
    const table = findings.getByRole('table', { name: `Findings: ${FAILING_LABEL}` });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Reference', 'Description', 'Difference', 'Age', 'Last entry']);

    const ref = within(table).getByRole('link', { name: 'client_wallet:4' });
    expect(ref).toHaveAttribute('href', '/finance?account=client_wallet');
    expect(ref).toHaveClass('mono');
    expect(within(table).getByText('Wallet · Basra Unlock Center')).toBeInTheDocument();
    expect(within(table).getByText('-$37.50')).toBeInTheDocument();
    expect(within(table).getByText(/3h ago$/)).toHaveClass('whitespace-nowrap');
  });

  it('prints the reference as plain mono text for a role that may not read the ledger', async () => {
    await openTab({ scenario: 'maintenance', permissions: ['system:read'] });
    const findings = within(await screen.findByRole('region', { name: 'Findings' }, SLOW));
    expect(findings.getByText('client_wallet:4')).toHaveClass('mono');
    expect(findings.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Finance' })).not.toBeInTheDocument();
  });

  it('links Finance in the note when the role may read the ledger', async () => {
    await openTab({ scenario: 'maintenance' });
    expect(screen.getByRole('link', { name: 'Finance' })).toHaveAttribute('href', '/finance');
  });
});

describe('Run check now', () => {
  it('states the effect before the confirm button, sends the run, and shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    const { lastRun } = await openTab();
    mockServer.use(
      http.post('*/admin/system/integrity/run', () =>
        problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Check already running',
          'Wait for the run that is going to finish.',
        ),
      ),
    );
    await user.click(lastRun.getByRole('button', { name: 'Run check now' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Run the integrity check?' }));
    expect(
      dialog.getByText('Runs the read-only ledger checks in the background; nothing is corrected.'),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Run check' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Wait for the run that is going to finish.');
    // The dialog stays open and no toast repeats the error.
    expect(screen.getByRole('dialog', { name: 'Run the integrity check?' })).toBeInTheDocument();
    expect(screen.queryByText('Check already running')).not.toBeInTheDocument();
  });

  describe('while the run works', () => {
    // The mock's run ends 250 ms after it starts; with the clock stopped it stays running until the test moves the clock.
    freezeClock('2026-10-31T12:00:00Z');

    it('sends the run, toasts, and shows Running with the button disabled until the run ends', async () => {
      const user = userEvent.setup();
      const writes = recordRequests('post', '/admin/system/integrity/run');
      const { lastRun } = await openTab();
      await user.click(lastRun.getByRole('button', { name: 'Run check now' }));
      const dialog = within(await screen.findByRole('dialog', { name: 'Run the integrity check?' }));
      await user.click(dialog.getByRole('button', { name: 'Run check' }));

      await waitFor(() => expect(writes).toHaveLength(1), SLOW);
      expect(writes[0].body).toBeUndefined();
      expect(await screen.findByText('Integrity check started')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Run the integrity check?' })).not.toBeInTheDocument(),
      );
      // The report says a run is going: the card names the start, shows the run before it, and the button waits.
      expect(await lastRun.findByText('Running, started just now', undefined, SLOW)).toBeInTheDocument();
      expect(lastRun.getByText('Previous run')).toBeInTheDocument();
      // The old run's duration and starter are not shown as if they were the new run's.
      expect(lastRun.queryByText('Duration')).not.toBeInTheDocument();
      expect(lastRun.queryByText('Started by')).not.toBeInTheDocument();
      const button = lastRun.getByRole('button', { name: 'Run check now' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'The check is running now');

      // Ten seconds later the run is over. Refresh reads the report again: the result is back, started by the owner.
      vi.setSystemTime(new Date('2026-10-31T12:00:10Z'));
      await user.click(screen.getByRole('button', { name: 'Refresh' }));
      await waitFor(() => expect(lastRun.queryByText(/^Running/)).not.toBeInTheDocument(), SLOW);
      expect(lastRun.getByText('Pass')).toBeInTheDocument();
      expect(lastRun.getByText('Rami K.')).toBeInTheDocument();
      expect(lastRun.getByRole('button', { name: 'Run check now' })).toBeEnabled();
    });
  });

  it('disables the button and says when it started when the report names the run that is going', async () => {
    answerWith(
      reportOf({
        running: true,
        lastRun: runOf({ startedAt: new Date(Date.now() - 130_000).toISOString() }),
      }),
    );
    const { lastRun } = await openTab();
    expect(lastRun.getByText('Running, started 2m ago')).toBeInTheDocument();
    expect(lastRun.getByRole('button', { name: 'Run check now' })).toBeDisabled();
  });
});

describe('permissions', () => {
  it('draws no Run button for a role that can change nothing, and the report still shows', async () => {
    const { lastRun } = await openTab({ permissions: ['system:read'] });
    expect(lastRun.getByText('Pass')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run check now' })).not.toBeInTheDocument();
  });

  it('draws no Run button for the read-only scenario', async () => {
    const { lastRun } = await openTab({ scenario: 'readonly' });
    expect(lastRun.getByText('Pass')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run check now' })).not.toBeInTheDocument();
  });

  it('disables the button and names the missing permission for a role that can change something else', async () => {
    const { lastRun } = await openTab({ permissions: ['system:read', 'alerts:update'] });
    const button = lastRun.getByRole('button', { name: 'Run check now' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the system:manage permission');
  });
});

describe('what a failing or empty read shows', () => {
  it('shows one error with the request id and Retry when the report cannot be read, and the note stays', async () => {
    await openHealthPage({ scenario: 'outage', route: ROUTE });
    const lastRun = within(await screen.findByRole('region', { name: 'Last run' }, SLOW));
    expect(
      await lastRun.findByText('Could not load the integrity check', undefined, SLOW),
    ).toBeInTheDocument();
    expect(lastRun.getByText('The database is not accepting connections.')).toBeInTheDocument();
    expect(lastRun.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    // The same failure is not printed once per card.
    expect(screen.queryByRole('region', { name: 'Ledger checks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Findings' })).not.toBeInTheDocument();
    expect(screen.getByText(/^This check only reads the ledger/)).toBeInTheDocument();
  });

  it('reads the report again with Retry and then shows it', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'outage', route: ROUTE });
    const lastRun = within(await screen.findByRole('region', { name: 'Last run' }, SLOW));
    await lastRun.findByText('Could not load the integrity check', undefined, SLOW);
    answerWith(
      reportOf({
        lastRun: runOf({ status: 'succeeded', finishedAt: new Date().toISOString(), durationMs: 9000 }),
        checks: [
          {
            ...unchecked('entries_balanced', 'Every entry sums to zero'),
            status: 'pass',
            difference: '0.0000',
          },
        ],
      }),
    );
    await user.click(lastRun.getByRole('button', { name: 'Retry' }));
    expect(await lastRun.findByText('Pass', undefined, SLOW)).toBeInTheDocument();
    expect(lastRun.queryByText('Could not load the integrity check')).not.toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Ledger checks' }, SLOW)).toBeInTheDocument();
  });

  it('spoils only the card that cannot draw an answer the console does not expect, not the tab', async () => {
    // The answer has no `checks`: the contract is assumed, so a part that cannot draw it shows a note and the rest stays.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockServer.use(
      http.get('*/admin/system/integrity', () =>
        HttpResponse.json({ running: false, lastRun: null, lastSuccessAt: null }),
      ),
    );
    const { lastRun } = await openTab();
    expect(lastRun.getByText('Not checked')).toBeInTheDocument();
    expect(await screen.findByText('The ledger checks cannot be shown', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText(/^This check only reads the ledger/)).toBeInTheDocument();
    quiet.mockRestore();
  });

  it('says Not checked and No data, never a pass, for a ledger nobody has checked', async () => {
    answerWith(
      reportOf({
        checks: [
          unchecked('entries_balanced', 'Every entry sums to zero'),
          unchecked('stuck_holds', 'No hold is stuck for more than 24 hours'),
        ],
      }),
    );
    const { lastRun } = await openTab();
    expect(lastRun.getByText('Not checked')).toBeInTheDocument();
    expect(lastRun.getByText('No run yet')).toBeInTheDocument();
    expect(lastRun.getByText('None yet')).toBeInTheDocument();
    expect(lastRun.queryByText('Pass')).not.toBeInTheDocument();

    const checks = await checksCard();
    // Unchecked rows are problems, so they are listed and nothing is folded away as passed.
    const table = await checks.findByRole('table', { name: 'Ledger checks' }, SLOW);
    expect(within(table).getAllByText('Not checked')).toHaveLength(2);
    expect(within(table).getAllByText('No data')).toHaveLength(4);
    expect(checks.queryByText(/passed/)).not.toBeInTheDocument();
  });

  it('says No data in the checks card when the answer has no checks', async () => {
    answerWith(reportOf());
    await openTab();
    const checks = await checksCard();
    expect(await checks.findByText('No data', undefined, SLOW)).toBeInTheDocument();
    expect(checks.getByText('The four ledger checks appear here after the first run.')).toBeInTheDocument();
  });

  it('says the run failed, with the server’s error text, and shows Failed and not a result', async () => {
    answerWith(
      reportOf({
        lastRun: runOf({
          status: 'failed',
          finishedAt: new Date().toISOString(),
          durationMs: 1200,
          error: 'connect ECONNREFUSED 10.0.3.12:5432',
        }),
        checks: [unchecked('entries_balanced', 'Every entry sums to zero')],
      }),
    );
    const { lastRun } = await openTab();
    expect(lastRun.getByText('Failed')).toBeInTheDocument();
    expect(lastRun.getByText('The run failed.')).toBeInTheDocument();
    expect(lastRun.getByText('connect ECONNREFUSED 10.0.3.12:5432')).toHaveClass('mono');
    expect(lastRun.queryByText('Pass')).not.toBeInTheDocument();
  });

  it('says how many findings came with the answer when the server counted more', async () => {
    const failing: IntegrityCheck = {
      key: 'stuck_holds',
      label: 'No hold is stuck for more than 24 hours',
      status: 'fail',
      count: 23,
      difference: null,
      findings: [
        {
          kind: 'hold',
          id: 7,
          ref: 'hold:7',
          label: 'Order #10422',
          difference: null,
          ageSeconds: 93_600,
          lastEntryAt: null,
        },
      ],
    };
    answerWith(
      reportOf({
        lastRun: runOf({ status: 'succeeded', finishedAt: new Date().toISOString() }),
        checks: [failing],
      }),
    );
    await openTab();
    const findings = within(await screen.findByRole('region', { name: 'Findings' }, SLOW));
    expect(findings.getByText('Showing the first 1 of 23')).toBeInTheDocument();
    // A hold has an age and no difference or last entry; none of the cells is empty text.
    expect(findings.getByText('1d 2h')).toBeInTheDocument();
    expect(findings.getAllByText('–')).toHaveLength(2);
    expect(findings.getByText('hold:7')).toHaveClass('mono');
    expect(findings.queryByRole('link')).not.toBeInTheDocument();
  });
});
