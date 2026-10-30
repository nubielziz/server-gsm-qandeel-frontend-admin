// Tests for the Help centre tab: the figures and columns (including the demo's "most readers said this did not help" line), the
// Publish toggle, the new article and edit dialogs with the server's field messages, and the search kept in the address.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, openStorefront, openTab, rowOf, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const TABLE = 'Help articles';
type User = ReturnType<typeof userEvent.setup>;

/** Opens the Help centre tab through the tab strip. */
async function openHelp(user: User) {
  const app = await openStorefront();
  await openTab(user, 'Help centre');
  await tableNamed(TABLE);
  return app;
}

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

describe('the table and the figures', () => {
  it('counts the articles, the published ones and the drafts', async () => {
    const user = userEvent.setup();
    const app = await openHelp(user);
    expect(app.location()).toBe('/storefront?tab=help');
    const strip = within(await screen.findByRole('region', { name: 'Help centre figures' }));
    await waitFor(() => expect(strip.getByText('Articles').parentElement).toHaveTextContent('12'));
    expect(strip.getByText('Published').parentElement).toHaveTextContent('11');
    expect(strip.getByText('In draft').parentElement).toHaveTextContent('1');
  });

  it('shows the topic, the helpful share, the votes and the status of each article', async () => {
    const user = userEvent.setup();
    await openHelp(user);
    const row = await rowOf(TABLE, 'Can I cancel my order?');
    expect(row.getByText('Orders')).toBeInTheDocument();
    expect(row.getByText('76%')).toBeInTheDocument();
    expect(row.getByText('127')).toBeInTheDocument();
    expect(row.getByText('Published')).toBeInTheDocument();
    expect(row.queryByText('Most readers said this did not help')).not.toBeInTheDocument();
  });

  it('warns on a published article that most readers found unhelpful', async () => {
    const user = userEvent.setup();
    await openHelp(user);
    const row = await rowOf(TABLE, 'My phone is still locked after unlocking');
    expect(row.getByText('60%')).toBeInTheDocument();
    expect(row.getByText('Most readers said this did not help')).toBeInTheDocument();
  });
});

describe('the Publish button', () => {
  it('unpublishes an article and publishes a draft', async () => {
    const user = userEvent.setup();
    await openHelp(user);
    await user.click(
      (await rowOf(TABLE, 'Can I cancel my order?')).getByRole('button', {
        name: 'Unpublish Can I cancel my order?',
      }),
    );
    expect(await screen.findByText('Article unpublished')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf(TABLE, 'Can I cancel my order?')).getByText('Draft')).toBeInTheDocument(),
    );
    const strip = within(screen.getByRole('region', { name: 'Help centre figures' }));
    await waitFor(() => expect(strip.getByText('In draft').parentElement).toHaveTextContent('2'));

    await user.click(
      (await rowOf(TABLE, 'How long do you keep my IMEI?')).getByRole('button', {
        name: 'Publish How long do you keep my IMEI?',
      }),
    );
    expect(await screen.findByText('Article published')).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        (await rowOf(TABLE, 'How long do you keep my IMEI?')).getByText('Published'),
      ).toBeInTheDocument(),
    );
  });
});

describe('New article and Edit', () => {
  it('asks for the fields, then saves an article as a draft', async () => {
    const user = userEvent.setup();
    await openHelp(user);
    await user.click(screen.getByRole('button', { name: 'New article…' }));
    const dialog = dialogOf('New article');
    await user.click(dialog.getByRole('button', { name: 'Save article' }));
    expect(await dialog.findByText('Enter a topic.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the question.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the answer.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Topic' }), 'Orders');
    await user.type(dialog.getByRole('textbox', { name: 'Question' }), 'Can I change the IMEI?');
    await user.type(dialog.getByRole('textbox', { name: 'Answer (Markdown)' }), 'No, place a new order.');
    await user.click(dialog.getByRole('button', { name: 'Save article' }));
    expect(await screen.findByText('Article saved')).toBeInTheDocument();
    expect(await screen.findByText('13 articles')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Can I change the IMEI?')).getByText('Draft')).toBeInTheDocument();
  });

  it('edits an article, starting from its Markdown answer, and sends only what changed', async () => {
    const user = userEvent.setup();
    await openHelp(user);
    await user.click(
      (await rowOf(TABLE, 'Where is my order?')).getByRole('button', { name: 'Edit Where is my order?' }),
    );
    const dialog = dialogOf('Edit article');
    expect(dialog.getByRole('textbox', { name: 'Answer (Markdown)' })).toHaveValue(
      'Short answer to "Where is my order?".',
    );
    expect(dialog.getByRole('checkbox', { name: 'Published on the help centre' })).toBeChecked();
    await retype(user, dialog.getByRole('textbox', { name: 'Question' }), 'Where is my unlock order?');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Article saved')).toBeInTheDocument();
    expect(await rowOf(TABLE, 'Where is my unlock order?')).toBeTruthy();
  });

  it('says nothing changed when nothing did', async () => {
    const user = userEvent.setup();
    await openHelp(user);
    await user.click(
      (await rowOf(TABLE, 'Where is my order?')).getByRole('button', { name: 'Edit Where is my order?' }),
    );
    await user.click(dialogOf('Edit article').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });

  it('shows the server’s message under the field it names', async () => {
    mockServer.use(
      http.patch('*/admin/help-articles/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'answerMd', message: 'The answer is too long for the help centre.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openHelp(user);
    await user.click(
      (await rowOf(TABLE, 'Where is my order?')).getByRole('button', { name: 'Edit Where is my order?' }),
    );
    const dialog = dialogOf('Edit article');
    await user.type(dialog.getByRole('textbox', { name: 'Answer (Markdown)' }), ' More.');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('The answer is too long for the help centre.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Answer (Markdown)' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('search and sort in the address', () => {
  it('searches question and topic and keeps the text in the address', async () => {
    const user = userEvent.setup();
    const app = await openHelp(user);
    await user.type(screen.getByRole('searchbox', { name: 'Search question or topic' }), 'refund');
    expect(await screen.findByText('1 article')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=help&q=refund');
    expect(await rowOf(TABLE, 'How do refunds work?')).toBeTruthy();
  });

  it('sorts by topic from the header', async () => {
    const user = userEvent.setup();
    const app = await openHelp(user);
    await user.click(screen.getByRole('button', { name: /^Topic/ }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=help&sort=category&dir=asc'));
  });
});
