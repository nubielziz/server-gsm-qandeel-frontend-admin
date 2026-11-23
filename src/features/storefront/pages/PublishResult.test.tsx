// Tests for the result of a publish run: the headline of a run applied on the shop, of one created switched off and of one that
// stopped or was discarded, the buttons that go on (Continue, Prepare again, Review the left out, the link to the services on the shop), the
// table of rows with its chips, sorts and pages, and the permissions of the buttons. The run switch has its own file.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { cancelPublishRun, createPublishRun } from '../api';
import { storefrontStore } from '../mocks/store';
import type { PublishItem } from '../types';
import { recordRequests } from '../test/requests';
import { lastOf, openRun, PUBLISH_PERMISSIONS } from '../test/publishPage';
import { rowOf, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const POLL = { timeout: 8_000 };
const RESULT = 'Publish result';
const ATT = 'AT&T USA Premier Unlock';
// The seeded runs: 1 succeeded on the shop, 2 succeeded switched off, 3 stalled, 4 a discarded draft, 6 never prepared, 7 from Quick add.
const [ON_SHOP, SWITCHED_OFF, STALLED, CHECKED_AGAIN, NEVER_PREPARED, QUICK_ADD] = [1, 2, 3, 4, 6, 7];
// The draft of 60 rows. "Check again" on it makes run 8 and points the draft at it.
const DRAFT = 5;

describe('a run that succeeded', () => {
  it('says how many services are on the shop, with the counts and the buttons that go on', async () => {
    await openRun(ON_SHOP);
    expect(await screen.findByText('9 services are on the shop')).toBeInTheDocument();
    expect(screen.getByText('9 published, 2 left out, 1 refused')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review the 3 left out' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'See the services on the shop' })).toHaveAttribute(
      'href',
      '/products?view=all',
    );
    expect(screen.getByRole('button', { name: 'Take these 9 off the shop' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('shows the note a finished run carries (a choice cut at the most a run takes) as a muted line, not an alert', async () => {
    const note = 'The choice has more than 5000 services. This run holds the first 5000.';
    const mock = (await storefrontStore()).publish.runs.find(String(ON_SHOP));
    if (!mock) throw new Error('No seeded run 1.');
    mock.run.error = note;
    await openRun(ON_SHOP);
    expect(await screen.findByText('9 services are on the shop')).toBeInTheDocument();
    const line = screen.getByText(note);
    expect(line).toHaveClass('text-ink2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // It sits under the counts, and the buttons of a finished run are all still there.
    expect(screen.getByText('9 published, 2 left out, 1 refused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take these 9 off the shop' })).toBeEnabled();
  });

  it('shows no note for a finished run that carries none', async () => {
    await openRun(ON_SHOP);
    expect(await screen.findByText('9 services are on the shop')).toBeInTheDocument();
    expect(screen.queryByText(/This run holds the first/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('never says "on the shop" for a run created switched off, and offers to put them on', async () => {
    await openRun(SWITCHED_OFF);
    expect(await screen.findByText('6 services were created switched off')).toBeInTheDocument();
    expect(screen.queryByText(/are on the shop/)).not.toBeInTheDocument();
    expect(screen.getByText('Done, switched off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put these 6 on the shop' })).toBeEnabled();
    // Nothing was left out, so there is nothing to review.
    expect(screen.queryByRole('button', { name: /^Review the/ })).not.toBeInTheDocument();
  });

  it('shows a run Quick add started as the system’s', async () => {
    await openRun(QUICK_ADD);
    expect(screen.getByRole('heading', { level: 2, name: 'Publish run 7' }).parentElement).toHaveTextContent(
      'by System',
    );
    expect(await screen.findByText('5 services are on the shop')).toBeInTheDocument();
  });

  it('Review the left out makes a new run of the rest and opens it', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openRun(ON_SHOP);
    await user.click(await screen.findByRole('button', { name: 'Review the 3 left out' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=publish&type=imei&run=8'));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs$/).body).toEqual({
      scope: { kind: 'run', runId: 1 },
    });
    expect(await screen.findByText('Preparing the preview of 3 services…')).toBeInTheDocument();
  });

  it('shows the server’s refusal when there is nothing left to review', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          {
            field: 'scope',
            message: 'Nothing to publish: every service of this choice is already on the shop.',
          },
        ]),
      ),
    );
    await openRun(ON_SHOP);
    await user.click(await screen.findByRole('button', { name: 'Review the 3 left out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing to publish');
  });
});

describe('a run that stopped or was discarded', () => {
  it('shows the server’s error once, with Continue, and the rows that were done', async () => {
    await openRun(STALLED);
    const error = 'The run stopped before it finished. Start it again: it continues with what is left.';
    expect(await screen.findByRole('alert')).toHaveTextContent(error);
    // The stalled error already holds the hint: it is not said twice.
    expect(screen.getAllByText(/it continues with what is left/)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Prepare again' })).not.toBeInTheDocument();
    expect(screen.getByText('4 published, 0 left out, 1 refused')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    // The rows that no result reached say so.
    const waiting = (await tableNamed(RESULT)).getAllByText('Waiting');
    expect(waiting).toHaveLength(5);
  });

  it('Continue publishes again what is left, and the page follows the run to its end', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openRun(STALLED);
    await user.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/3\/apply$/).body).toEqual({});
    expect(await screen.findByRole('meter', { name: 'Publish progress' }, POLL)).toBeInTheDocument();
    expect(await screen.findByText('10 services are on the shop', {}, POLL)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('re-reads the run and says so when Continue meets a run that is already going', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', () =>
        problem(409, 'JOB_ALREADY_RUNNING', 'Already running', 'This run is already being published.'),
      ),
    );
    const requests = recordRequests();
    await openRun(STALLED);
    await user.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('This run is already being published.')).toBeInTheDocument();
    await waitFor(() => {
      const reads = requests
        .sent()
        .filter((one) => one.method === 'GET' && /\/publish-runs\/3$/.test(one.url.pathname));
      expect(reads.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('offers Prepare again, not Continue, for a preview that never finished', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openRun(NEVER_PREPARED);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The preview was not finished. Start a new one.',
    );
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    expect(screen.queryByText(/it continues with what is left/)).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: RESULT })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prepare again' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=publish&type=imei&run=8'));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs$/).body).toEqual({
      scope: { kind: 'all' },
      listed: true,
    });
  });

  it('says a preview was checked again, with a link to the newer run, and shows no table', async () => {
    const user = userEvent.setup();
    const app = await openRun(CHECKED_AGAIN);
    expect(await screen.findByText(/This preview was checked again\./)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: RESULT })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Take these|^Put these/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open the newer run' }));
    expect(app.location()).toBe('/products?view=publish&run=5');
    expect(await screen.findByLabelText('Publish preview')).toBeInTheDocument();
  });

  it('says a discarded preview was discarded', async () => {
    mockServer.use(
      http.get('*/admin/publish-runs/:id', ({ params }) =>
        HttpResponse.json({
          id: Number(params.id),
          status: 'cancelled',
          source: 'console',
          quickAddRunId: null,
          scope: { kind: 'all' },
          listed: true,
          auto: false,
          total: 4,
          replacedBy: null,
          error: null,
          requestedBy: 1,
          requestedByName: 'Rami K.',
          counts: {
            ready: 4,
            review: 0,
            blocked: 0,
            included: 4,
            noRule: 0,
            published: 0,
            skipped: 0,
            refused: 0,
            pending: 4,
          },
          switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
          createdAt: new Date().toISOString(),
          preparedAt: new Date().toISOString(),
          startedAt: null,
          finishedAt: null,
        }),
      ),
    );
    await openRun(9);
    expect(await screen.findByText('This preview was discarded.')).toBeInTheDocument();
    // Nothing started, so there is no headline and no "stopped" line.
    expect(screen.queryByText(/This run was stopped/)).not.toBeInTheDocument();
    expect(screen.queryByText(/published, \d+ left out/)).not.toBeInTheDocument();
  });
});

describe('a "Check again" run that was discarded while it was prepared', () => {
  /** Checks the draft again (run 8, the draft now points at it) and discards run 8 while it is still prepared. */
  async function discardTheReplacement() {
    await signInAs();
    const made = await createPublishRun({ scope: { kind: 'run', runId: DRAFT } });
    await cancelPublishRun(made.id);
    return made.id;
  }

  it('offers Prepare again, which copies the earlier draft once more and points it at the new run', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const dead = await discardTheReplacement();
    const app = await openRun(dead);
    expect(await screen.findByText('This preview was discarded.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Review the/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Prepare again' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=publish&type=imei&run=9'));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs$/).body).toEqual({
      scope: { kind: 'run', runId: DRAFT },
      listed: true,
    });
    expect(await screen.findByText('Preparing the preview of 60 services…')).toBeInTheDocument();
    // The new draft holds every row of the earlier one, and the earlier draft says it was checked again, now by run 9.
    expect(await screen.findByRole('table', { name: 'Publish preview' }, POLL)).toBeInTheDocument();
    await openRun(DRAFT);
    expect(await screen.findByText(/This preview was checked again\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the newer run' })).toHaveAttribute(
      'href',
      '/products?view=publish&run=9',
    );
  });

  it('shows the server’s refusal when the earlier draft already has a live newer run', async () => {
    const user = userEvent.setup();
    const dead = await discardTheReplacement();
    // Prepared again once already: the draft points at run 9, which is being prepared, so run 8 cannot do it a second time.
    await createPublishRun({ scope: { kind: 'run', runId: DRAFT } });
    await openRun(dead);
    await user.click(await screen.findByRole('button', { name: 'Prepare again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This preview was already checked again.');
  });

  it('offers nothing for a preview of another scope that was discarded while it was prepared', async () => {
    mockServer.use(
      http.get('*/admin/publish-runs/:id', ({ params }) =>
        HttpResponse.json({
          id: Number(params.id),
          status: 'cancelled',
          source: 'console',
          quickAddRunId: null,
          scope: { kind: 'all' },
          listed: true,
          auto: false,
          total: 4,
          replacedBy: null,
          error: null,
          requestedBy: 1,
          requestedByName: 'Rami K.',
          counts: {
            ready: 0,
            review: 0,
            blocked: 0,
            included: 0,
            noRule: 0,
            published: 0,
            skipped: 0,
            refused: 0,
            pending: 4,
          },
          switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
          createdAt: new Date().toISOString(),
          preparedAt: null,
          startedAt: null,
          finishedAt: null,
        }),
      ),
    );
    await openRun(9);
    expect(await screen.findByText('This preview was discarded.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prepare again' })).not.toBeInTheDocument();
  });
});

describe('a "Check again" run that failed or stalled while it was prepared', () => {
  /** Checks the draft again (run 8, the draft now points at it) and ends run 8 as the server leaves it: failed, never prepared. */
  async function failTheReplacement(error: string) {
    await signInAs();
    const made = await createPublishRun({ scope: { kind: 'run', runId: DRAFT } });
    const mock = (await storefrontStore()).publish.runs.find(String(made.id));
    if (!mock) throw new Error('The new run is not in the mock.');
    mock.run.status = 'failed';
    mock.run.error = error;
    return made.id;
  }

  it.each([
    ['failed', 'The preview could not be prepared.'],
    ['stalled while it was prepared', 'The preview was not finished. Start a new one.'],
  ])(
    'offers Prepare again for a replacement that %s, and it repoints the earlier draft',
    async (_name, error) => {
      const user = userEvent.setup();
      const requests = recordRequests();
      const dead = await failTheReplacement(error);
      const app = await openRun(dead);
      expect(await screen.findByRole('alert')).toHaveTextContent(error);
      // Never prepared: there are no rows to continue from, only a new preview to make.
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Review the/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('table', { name: RESULT })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Prepare again' }));
      await waitFor(() => expect(app.location()).toBe('/products?view=publish&type=imei&run=9'));
      expect(lastOf(requests, 'POST', /\/admin\/publish-runs$/).body).toEqual({
        scope: { kind: 'run', runId: DRAFT },
        listed: true,
      });
      expect(await screen.findByRole('table', { name: 'Publish preview' }, POLL)).toBeInTheDocument();
      // The earlier draft now says it was checked again, by run 9 and not by the dead run 8.
      await openRun(DRAFT);
      expect(await screen.findByRole('link', { name: 'Open the newer run' })).toHaveAttribute(
        'href',
        '/products?view=publish&run=9',
      );
    },
  );

  it('shows the server’s refusal when a replacement that failed was already prepared again', async () => {
    const user = userEvent.setup();
    const dead = await failTheReplacement('The preview could not be prepared.');
    // Prepared again once already: the draft points at run 9, which is alive, so run 8 cannot do it a second time.
    await createPublishRun({ scope: { kind: 'run', runId: DRAFT } });
    await openRun(dead);
    await user.click(await screen.findByRole('button', { name: 'Prepare again' }));
    // The run's own error is an alert too: look for the refusal by its words.
    expect(await screen.findByText('This preview was already checked again.')).toBeInTheDocument();
  });
});

describe('the permissions', () => {
  const without = (permission: string) => PUBLISH_PERMISSIONS.filter((one) => one !== permission);

  it('disables Continue without storefront:publish, and names it', async () => {
    await openRun(STALLED, { permissions: without('storefront:publish') });
    const resume = await screen.findByRole('button', { name: 'Continue' });
    expect(resume).toBeDisabled();
    expect(resume).toHaveAttribute('title', 'You need the storefront:publish permission');
  });

  it('disables the switch of a finished run without storefront:publish', async () => {
    await openRun(ON_SHOP, { permissions: without('storefront:publish') });
    const off = await screen.findByRole('button', { name: 'Take these 9 off the shop' });
    expect(off).toBeDisabled();
    expect(off).toHaveAttribute('title', 'You need the storefront:publish permission');
  });
});

describe('the table of rows', () => {
  it('shows what happened to each row: the result and why, the service, its facts, its cost and price, and whether it is on the shop', async () => {
    await openRun(ON_SHOP);
    const table = await tableNamed(RESULT);
    expect(table.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Result',
      'Service',
      'Brand / Carrier / Country',
      'Cost',
      'Shop price',
      'On the shop',
    ]);
    const att = await rowOf(RESULT, ATT);
    expect(att.getByText('Published')).toBeInTheDocument();
    // The supplier's own name is shown as the supplier sent it, under the clean title.
    expect(att.getByText('AT&amp;T USA Premier Unlock [Clean] 1-3 Days')).toHaveAttribute('dir', 'auto');
    expect(att.getByText('IMP-101 /atandt-usa-premier-unlock')).toBeInTheDocument();
    expect(att.getByText('Apple · AT&T · US')).toBeInTheDocument();
    expect(att.getByText('$13.50')).toBeInTheDocument();
    expect(att.getByText('$16.99')).toBeInTheDocument();
    expect(att.getByText('Floor $15.74')).toBeInTheDocument();
    expect(att.getByText('Rule')).toBeInTheDocument();
    expect(att.getByText('On')).toBeInTheDocument();
  });

  it('shows a price that replaces a typed price, a typed price and a kept price with their tags', async () => {
    await openRun(ON_SHOP);
    const verizon = await rowOf(RESULT, 'IMP-103 /verizon-usa-clean-unlock');
    expect(verizon.getByText('replaces $8.49')).toBeInTheDocument();
    expect(verizon.getByText('$8.99')).toBeInTheDocument();
    const vodafone = await rowOf(RESULT, 'Vodafone UK iPhone Unlock');
    expect(vodafone.getByText('$9.99')).toBeInTheDocument();
    expect(vodafone.getByText('Typed')).toBeInTheDocument();
  });

  it('says why a row was left out or refused, with the server’s detail, and has no On the shop mark for them', async () => {
    await openRun(ON_SHOP);
    const refused = await rowOf(
      RESULT,
      'Unlock iPhone 11 12 13 14 15 Pro Max All Carriers USA Canada UK Australia 1-5 Days Clean Barred Unpaid Bills Fast',
    );
    expect(refused.getByText('Refused')).toBeInTheDocument();
    expect(
      refused.getByText(
        'The cost changed a lot since the preview. The cost moved from $9.80 to $15.10, more than the rule allows.',
      ),
    ).toBeInTheDocument();
    expect(refused.getByText('–')).toBeInTheDocument();
    const left = await rowOf(RESULT, 'IMP-124 /vodafone-germany-unlock-2');
    expect(left.getByText('Left out')).toBeInTheDocument();
  });

  it('has chips with the run’s counts, and a chip asks the server for that result and keeps it in the address', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openRun(ON_SHOP);
    const chips = within(await screen.findByRole('group', { name: 'Show rows' }));
    expect(chips.getAllByRole('button').map((chip) => chip.textContent)).toEqual([
      'All (12)',
      'Published (9)',
      'Left out (2)',
      'Refused (1)',
    ]);
    await user.click(chips.getByRole('button', { name: 'Left out (2)' }));
    await waitFor(() =>
      expect(lastOf(requests, 'GET', /\/items$/).url.searchParams.get('result')).toBe('skipped'),
    );
    expect(app.location()).toBe('/products?view=publish&run=1&result=skipped');
    await waitFor(async () => expect((await tableNamed(RESULT)).getAllByRole('row')).toHaveLength(3));
    expect(chips.getByRole('button', { name: 'Left out (2)' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(chips.getByRole('button', { name: 'All (12)' }));
    await waitFor(() =>
      expect(lastOf(requests, 'GET', /\/items$/).url.searchParams.get('result')).toBeNull(),
    );
  });

  it('sorts by cost and by title on the server, and asks for 50 rows a page', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openRun(ON_SHOP);
    await tableNamed(RESULT);
    const first = lastOf(requests, 'GET', /\/items$/).url.searchParams;
    expect([first.get('_start'), first.get('_end'), first.get('_sort'), first.get('_order')]).toEqual([
      '0',
      '50',
      'id',
      'asc',
    ]);
    await user.click((await tableNamed(RESULT)).getByRole('button', { name: /Cost/ }));
    await waitFor(() =>
      expect(lastOf(requests, 'GET', /\/items$/).url.searchParams.get('_sort')).toBe('cost'),
    );
    await user.click((await tableNamed(RESULT)).getByRole('button', { name: /Service/ }));
    await waitFor(() =>
      expect(lastOf(requests, 'GET', /\/items$/).url.searchParams.get('_sort')).toBe('title'),
    );
  });

  it('pages a long run on the server', async () => {
    const user = userEvent.setup();
    const base = {
      id: 0,
      serviceId: 0,
      service: { id: 0, name: '', code: '', type: 'imei', categoryName: '' },
      title: '',
      slug: '',
      brand: '',
      carrier: '',
      country: '',
      detected: { title: '', slug: '', brand: '', brandKind: null, carrier: '', country: '' },
      edited: false,
      cost: '1.0000',
      floorPrice: '1.2000',
      rule: null,
      rulePrice: null,
      priceMode: 'rule',
      existingPrice: null,
      replacesPrice: null,
      retailPrice: '1.5000',
      marginPct: '20.0000',
      state: 'ready',
      blockedReason: null,
      flags: [],
      included: true,
      evaluatedAt: null,
      result: 'published',
      resultReason: null,
      resultDetail: null,
      listingId: 5,
      publishedPrice: '1.5000',
      listingListed: true,
    };
    const all = Array.from({ length: 120 }, (_, i): PublishItem => ({
      ...(base as PublishItem),
      id: i + 1,
      serviceId: i + 1,
      title: `Row ${i + 1}`,
      service: { id: i + 1, name: `Raw ${i + 1}`, code: `C-${i + 1}`, type: 'imei', categoryName: '' },
    }));
    mockServer.use(
      http.get('*/admin/publish-runs/1/items', ({ request }) => {
        const params = new URL(request.url).searchParams;
        const page = all.slice(Number(params.get('_start')), Number(params.get('_end')));
        return HttpResponse.json(page, {
          headers: { 'x-total-count': '120', 'access-control-expose-headers': 'x-total-count' },
        });
      }),
    );
    const requests = recordRequests();
    await openRun(ON_SHOP);
    expect(await screen.findByText('Results: 1 - 50 of 120')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 51 - 100 of 120')).toBeInTheDocument();
    const second = lastOf(requests, 'GET', /\/items$/).url.searchParams;
    expect([second.get('_start'), second.get('_end')]).toEqual(['50', '100']);
    expect(await rowOf(RESULT, 'Row 51')).toBeTruthy();
  });
});
