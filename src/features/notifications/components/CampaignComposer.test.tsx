// Tests for the campaign composer, run through the whole app against the dev mock API: the required fields, the two channels, the one title and
// text, the live count that waits for a pause, the server's field errors, the people-picker button and saving a draft.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, openNotifications, recordRequests } from '../test/notificationsPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => mockServer.events.removeAllListeners());

/** Opens the list, presses New campaign and returns the composer. */
async function openComposer(options: { permissions?: string[] } = {}) {
  const user = userEvent.setup();
  const app = await openNotifications('/notifications', options);
  await user.click(screen.getByRole('button', { name: 'New campaign' }));
  const composer = await screen.findByRole('dialog', { name: 'New campaign' });
  return { user, app, composer: within(composer) };
}

/** Fills name, title and text. */
async function writeMessage(
  user: ReturnType<typeof userEvent.setup>,
  composer: ReturnType<typeof within>,
  name = 'Winter promo',
) {
  await user.type(composer.getByRole('textbox', { name: 'Name' }), name);
  await user.type(composer.getByRole('textbox', { name: 'Title' }), 'Big news');
  await user.type(composer.getByRole('textbox', { name: 'Text' }), 'Hello {{{{name}}');
}

describe('the required fields', () => {
  it('shows a hint for each missing field after the first try, and sends nothing', async () => {
    const sent = recordRequests('/admin/notification-campaigns');
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Save draft' }));
    expect(await composer.findByText('Give the campaign a name.')).toBeInTheDocument();
    expect(composer.getByText('Write the title.')).toBeInTheDocument();
    expect(composer.getByText('Write the text.')).toBeInTheDocument();
    expect(
      composer.getAllByText('Choose at least one group of people, or add people.').length,
    ).toBeGreaterThan(0);
    expect(sent.filter((request) => request.method === 'POST')).toEqual([]);
  });

  it('starts with a service announcement by in-app and email, and nobody chosen', async () => {
    const { composer } = await openComposer();
    expect(composer.getByRole('radio', { name: /Service announcement/ })).toBeChecked();
    expect(composer.getByRole('checkbox', { name: 'In-app' })).toBeChecked();
    expect(composer.getByRole('checkbox', { name: 'Email' })).toBeChecked();
    expect(composer.getByText(/Choose who gets the message/)).toBeInTheDocument();
  });
});

describe('the channels', () => {
  it('are the app and email, whoever is targeted, and both stay available for merchants', async () => {
    const { user, composer } = await openComposer();
    const channels = () => within(composer.getByRole('group', { name: 'Channels' }));
    expect(channels().getAllByRole('checkbox')).toHaveLength(2);
    expect(composer.queryByRole('checkbox', { name: /Telegram/ })).not.toBeInTheDocument();
    await user.click(composer.getByRole('button', { name: 'Merchants' }));
    expect(channels().getAllByRole('checkbox')).toHaveLength(2);
    expect(composer.getByRole('checkbox', { name: 'In-app' })).toBeEnabled();
    expect(composer.getByRole('checkbox', { name: 'Email' })).toBeEnabled();
    expect(composer.queryByRole('checkbox', { name: /Telegram/ })).not.toBeInTheDocument();
  });
});

describe('the message', () => {
  it('is one title and one text, with no language tabs, and keeps what was typed', async () => {
    const { user, composer } = await openComposer();
    expect(composer.queryByRole('tab')).not.toBeInTheDocument();
    const title = composer.getByRole('textbox', { name: 'Title' });
    const body = composer.getByRole('textbox', { name: 'Text' });
    expect(title).not.toHaveAttribute('dir');
    expect(body).not.toHaveAttribute('dir');
    expect(composer.queryByText(/Arabic/)).not.toBeInTheDocument();
    await user.type(title, 'Winter news');
    await user.type(body, 'Hello');
    expect(title).toHaveValue('Winter news');
    expect(body).toHaveValue('Hello');
  });

  it('counts the characters of the text and explains {{name}}', async () => {
    const { user, composer } = await openComposer();
    await user.type(composer.getByRole('textbox', { name: 'Text' }), 'Hello');
    expect(composer.getByText('5 / 3500')).toBeInTheDocument();
    expect(composer.getByText('{{name}}')).toBeInTheDocument();
  });
});

describe('the live count', () => {
  it('asks the server once after a pause with the audience, channels and purpose, and shows the answer', async () => {
    const sent = recordRequests('/audience-preview');
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Everyone' }));
    await user.click(composer.getByRole('radio', { name: /Marketing/ }));
    await user.click(composer.getByRole('radio', { name: /Service announcement/ }));
    const count = within(composer.getByRole('region', { name: 'Reach' }));
    expect(await count.findByText(/\d+ people/, undefined, { timeout: 5_000 })).toBeInTheDocument();
    const last = sent.at(-1);
    expect(last?.body).toEqual({
      audience: { staff: {}, merchants: {}, customers: { hasAccount: true } },
      channels: ['in_app', 'email'],
      purpose: 'service',
    });
    // The quick changes before the pause were not each sent: the empty audience, and the marketing flip, never reached the server.
    expect(sent.length).toBeLessThanOrEqual(2);
    expect(count.getByText('Who')).toBeInTheDocument();
    expect(count.getByText('Messages')).toBeInTheDocument();
    expect(count.queryByText('Language')).not.toBeInTheDocument();
  });

  it('says who is left out and why for marketing', async () => {
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('radio', { name: /Marketing/ }));
    await user.click(composer.getByRole('button', { name: 'Retail' }));
    const count = within(composer.getByRole('region', { name: 'Reach' }));
    expect(
      await count.findByText(/retail accounts did not agree to marketing/, undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
  });

  it('asks nothing while the audience is incomplete or a country code is wrong', async () => {
    const sent = recordRequests('/audience-preview');
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Retail' }));
    await user.type(composer.getByRole('textbox', { name: 'Countries' }), 'Jordan');
    expect(await composer.findByText(/Not a code: JORDAN/)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(sent).toEqual([]);
  });

  it('shows the server refusal of the count in place of the numbers', async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/audience-preview', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Choose at least one group.'),
      ),
    );
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Staff' }));
    expect(
      await within(composer.getByRole('region', { name: 'Reach' })).findByText(
        'Choose at least one group.',
        undefined,
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
  });
});

describe('the audience builder', () => {
  it('lights the preset that matches, and none once a filter narrows it', async () => {
    const { user, composer } = await openComposer();
    const presets = within(composer.getByRole('group', { name: 'Audience preset' }));
    await user.click(presets.getByRole('button', { name: 'Everyone' }));
    expect(presets.getByRole('button', { name: 'Everyone' })).toHaveAttribute('aria-pressed', 'true');
    await user.type(composer.getAllByRole('textbox', { name: 'Countries' })[0], 'JO');
    expect(presets.getByRole('button', { name: 'Everyone' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers the merchant ranks, and no status choice, for the merchant group', async () => {
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Merchants' }));
    const ranks = await composer.findByRole('group', { name: 'Only these ranks' });
    expect(await within(ranks).findByRole('checkbox', { name: 'Wholesale' })).toBeInTheDocument();
    // The retail rank holds no merchant accounts, so it is not offered here.
    expect(within(ranks).queryByRole('checkbox', { name: /retail/i })).not.toBeInTheDocument();
    expect(within(ranks).getByText('Every merchant rank.')).toBeInTheDocument();
    expect(composer.queryByRole('group', { name: 'Status' })).not.toBeInTheDocument();
    expect(composer.queryByRole('checkbox', { name: 'Not active yet' })).not.toBeInTheDocument();
  });

  it('sends the picked merchant ranks as groupIds and never a status', async () => {
    const sent = recordRequests('/audience-preview');
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Merchants' }));
    const ranks = await composer.findByRole('group', { name: 'Only these ranks' });
    await user.click(await within(ranks).findByRole('checkbox', { name: 'Wholesale' }));
    await waitFor(
      () =>
        expect(sent.at(-1)?.body).toEqual({
          audience: { merchants: { groupIds: [expect.any(Number)] } },
          channels: ['in_app', 'email'],
          purpose: 'service',
        }),
      { timeout: 5_000 },
    );
  });

  it('says retail accounts and guests for the retail group, and names its choices', async () => {
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Retail' }));
    expect(composer.getByText(/Retail accounts and guests of the storefront/)).toBeInTheDocument();
    const who = within(composer.getByRole('group', { name: 'Retail accounts with a login or guests' }));
    expect(who.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'All',
      'With a login',
      'Guests',
    ]);
  });

  it('offers the roles of the server as checkboxes for the staff group', async () => {
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Staff' }));
    const roles = await composer.findByRole('group', { name: 'Only these roles' });
    expect(await within(roles).findByRole('checkbox', { name: 'Support' })).toBeInTheDocument();
    expect(within(roles).getByText('Every role.')).toBeInTheDocument();
  });

  it('says what is missing when the role may not read roles', async () => {
    const { user, composer } = await openComposer({
      permissions: ['dashboard:read', 'broadcasts:read', 'broadcasts:send'],
    });
    await user.click(composer.getByRole('button', { name: 'Staff' }));
    expect(await composer.findByText(/You need the roles:read permission/)).toBeInTheDocument();
  });

  it('shows link fields only for the people the audience reaches', async () => {
    const { user, composer } = await openComposer();
    expect(composer.queryByRole('textbox', { name: /^Link for/ })).not.toBeInTheDocument();
    await user.click(composer.getByRole('button', { name: 'Retail' }));
    expect(composer.getByRole('textbox', { name: 'Link for retail accounts' })).toHaveAttribute(
      'placeholder',
      '/account/orders',
    );
    expect(composer.queryByRole('textbox', { name: 'Link for staff' })).not.toBeInTheDocument();
    await user.click(composer.getByRole('button', { name: 'Merchants' }));
    expect(composer.getByRole('textbox', { name: 'Link for merchants' })).toHaveAttribute(
      'placeholder',
      '/merchant/orders',
    );
  });
});

describe('the server field errors', () => {
  it('shows them under their fields, and the rest above the form', async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'That name is taken.' },
          { field: 'content.body', message: 'Only {{name}} can be used.' },
          { field: 'audience.merchants.countries', message: 'Use an ISO code.' },
          { field: 'mystery', message: 'Something else.' },
        ]),
      ),
    );
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Merchants' }));
    await writeMessage(user, composer);
    await user.click(composer.getByRole('button', { name: 'Save draft' }));
    expect(await composer.findByText('That name is taken.')).toBeInTheDocument();
    expect(composer.getByText('Only {{name}} can be used.')).toBeInTheDocument();
    expect(composer.getByText('Use an ISO code.')).toBeInTheDocument();
    expect(composer.getByText('mystery: Something else.')).toBeInTheDocument();
    // The drawer stays open so nothing typed is lost.
    expect(composer.getByRole('textbox', { name: 'Name' })).toHaveValue('Winter promo');
  });

  it('shows a refusal of another kind as a general message', async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the broadcasts:send permission.'),
      ),
    );
    const { user, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Staff' }));
    await writeMessage(user, composer);
    await user.click(composer.getByRole('button', { name: 'Save draft' }));
    expect(await composer.findByText('You need the broadcasts:send permission.')).toBeInTheDocument();
  });
});

describe('saving', () => {
  it('posts the whole form as a new draft and opens the campaign', async () => {
    const sent = recordRequests('/admin/notification-campaigns');
    const { user, app, composer } = await openComposer();
    await user.click(composer.getByRole('button', { name: 'Staff' }));
    await writeMessage(user, composer);
    await user.click(composer.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(app.location()).toBe('/notifications/4'), { timeout: 10_000 });
    const post = sent.find(
      (request) =>
        request.method === 'POST' && request.url.pathname.endsWith('/admin/notification-campaigns'),
    );
    expect(post?.body).toEqual({
      name: 'Winter promo',
      purpose: 'service',
      channels: ['in_app', 'email'],
      audience: { staff: {} },
      content: { title: 'Big news', body: 'Hello {{name}}' },
      link: null,
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Winter promo' })).toBeInTheDocument();
    expect(await screen.findByText('Draft')).toBeInTheDocument();
  });

  it('closes with Cancel and starts empty the next time', async () => {
    const { user, composer } = await openComposer();
    await user.type(composer.getByRole('textbox', { name: 'Name' }), 'Half written');
    await user.click(composer.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'New campaign' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New campaign' }));
    expect(
      within(
        dialogOf('New campaign').getByRole('textbox', { name: 'Name' }).closest('dialog') as HTMLElement,
      ).getByRole('textbox', { name: 'Name' }),
    ).toHaveValue('');
  });

  it('sends nothing and says so for a role without broadcasts:send (the button is disabled)', async () => {
    const { composer } = await openComposer({
      permissions: ['dashboard:read', 'broadcasts:read', 'broadcasts:send'],
    });
    expect(composer.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });
});
