// Tests for the Content and legal tab: the pages and blog table with its publish toggle, the edit and new page dialogs, and the legal
// documents table with New version and the Publish confirm ("it appears in later consents").
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { storefrontStore } from '../mocks/store';
import { recordRequests } from '../test/requests';
import { dialogOf, openStorefront, openTab, rowOf, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const PAGES = 'Pages and blog posts';
const LEGAL = 'Legal documents';
type User = ReturnType<typeof userEvent.setup>;

/** Opens the Content and legal tab through the tab strip. */
async function openContent(user: User) {
  const app = await openStorefront();
  await openTab(user, 'Content and legal');
  await tableNamed(LEGAL);
  return app;
}

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

describe('pages and blog', () => {
  it('lists the static pages and blog posts', async () => {
    const user = userEvent.setup();
    const app = await openContent(user);
    expect(app.location()).toBe('/storefront?tab=content');
    const about = await rowOf(PAGES, 'About us');
    expect(about.getByText('/about')).toBeInTheDocument();
    expect(about.getByText('Page')).toBeInTheDocument();
    expect(about.getByText('Published')).toBeInTheDocument();
    const blog = await rowOf(PAGES, 'How to know if your iPhone is locked');
    expect(blog.getByText('/blog/is-my-iphone-locked')).toBeInTheDocument();
    expect(blog.getByText('Blog post')).toBeInTheDocument();
    expect((await rowOf(PAGES, 'Unlocking vs jailbreaking')).getByText('Draft')).toBeInTheDocument();
    const table = await tableNamed(PAGES);
    expect(table.getAllByRole('row')).toHaveLength(7);
  });

  it('unpublishes a published page and publishes a draft from the row button', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click((await rowOf(PAGES, 'About us')).getByRole('button', { name: 'Unpublish About us' }));
    expect(await screen.findByText('Page unpublished')).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        (await rowOf(PAGES, 'About us')).getByRole('button', { name: 'Publish About us' }),
      ).toBeInTheDocument(),
    );
    await user.click(
      (await rowOf(PAGES, 'Unlocking vs jailbreaking')).getByRole('button', {
        name: 'Publish Unlocking vs jailbreaking',
      }),
    );
    expect(await screen.findByText('Page published')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf(PAGES, 'Unlocking vs jailbreaking')).getByText('Published')).toBeInTheDocument(),
    );
  });

  it('edits a page and writes a new one as a draft, with only the two content types to choose from', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click((await rowOf(PAGES, 'About us')).getByRole('button', { name: 'Edit About us' }));
    const edit = dialogOf('Edit About us');
    await retype(user, edit.getByRole('textbox', { name: 'Title' }), 'About IMEI-HUB');
    await user.click(edit.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Page saved')).toBeInTheDocument();
    expect(await rowOf(PAGES, 'About IMEI-HUB')).toBeTruthy();

    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'New page…' }));
    const create = dialogOf('New page');
    expect(
      within(create.getByRole('combobox', { name: 'Type' }))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Page', 'Blog post']);
    // A new page has no Slug box (the server makes the address from the title) and the search texts wait in the fold.
    expect(create.queryByRole('textbox', { name: 'Slug' })).not.toBeInTheDocument();
    expect(create.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    await user.type(create.getByRole('textbox', { name: 'Title' }), 'Refund guide');
    await user.type(create.getByRole('textbox', { name: 'Text (Markdown)' }), '# Refunds');
    await user.click(create.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Page saved as a draft')).toBeInTheDocument();
    expect((await rowOf(PAGES, 'Refund guide')).getByText('Draft')).toBeInTheDocument();
    // Left at their defaults the page is sent exactly as before, without a slug.
    const posts = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname.endsWith('/admin/content-pages'));
    expect(posts.map((sent) => sent.body)).toEqual([
      { kind: 'static', title: 'Refund guide', bodyMd: '# Refunds' },
    ]);
  });

  it('keeps the Slug box on an edit, and opens the fold when the page has search texts of its own', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click((await rowOf(PAGES, 'About us')).getByRole('button', { name: 'Edit About us' }));
    const edit = dialogOf('Edit About us');
    expect(edit.getByRole('textbox', { name: 'Slug' })).toHaveValue('about');
    // The seed gives the page a search title, so the fold starts open.
    expect(edit.getByRole('button', { name: 'Hide more options' })).toHaveAttribute('aria-expanded', 'true');
    expect(edit.getByRole('textbox', { name: 'Search title' })).toHaveValue('About us');
  });

  it('keeps the fold of a new page open while a search text holds the server’s message', async () => {
    mockServer.use(
      http.post('*/admin/content-pages', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'seoTitle', message: 'Use at most 70 characters.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'New page…' }));
    const create = dialogOf('New page');
    await user.type(create.getByRole('textbox', { name: 'Title' }), 'Refund guide');
    await user.click(create.getByRole('button', { name: 'More options' }));
    await user.type(create.getByRole('textbox', { name: 'Search title' }), 'A title');
    await user.click(create.getByRole('button', { name: 'Hide more options' }));
    await user.click(create.getByRole('button', { name: 'Save draft' }));
    expect(await create.findByText('Use at most 70 characters.')).toBeVisible();
    expect(create.getByRole('button', { name: 'Hide more options' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows a message about the address of a new page in the dialog, as there is no box for it', async () => {
    mockServer.use(
      http.post('*/admin/content-pages', () =>
        problem(409, 'CONFLICT', 'Address in use', 'Another page already uses this address.', [
          { field: 'slug', message: 'Another page already uses this address.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'New page…' }));
    const create = dialogOf('New page');
    await user.type(create.getByRole('textbox', { name: 'Title' }), 'About us');
    await user.click(create.getByRole('button', { name: 'Save draft' }));
    expect(await create.findByText(/Another page already uses this address/)).toBeVisible();
  });
});

describe('legal documents', () => {
  it('shows the versions in force and the draft waiting to be published, and the earlier versions as a line', async () => {
    const user = userEvent.setup();
    await openContent(user);
    const table = await tableNamed(LEGAL);
    const terms = within(
      table.getByRole('button', { name: 'New version of Terms of service v3.2' }).closest('tr')!,
    );
    expect(terms.getByText('v3.2')).toBeInTheDocument();
    // The language line under the document name is gone: English is the only language.
    expect(terms.queryByText('English')).not.toBeInTheDocument();
    const draft = await rowOf(LEGAL, 'v1.5');
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.getByRole('button', { name: 'Publish Refund policy v1.5' })).toBeInTheDocument();
    expect(draft.getByText('Not asked')).toBeInTheDocument();
    expect(
      screen.getByText(/^Earlier versions kept for the record: Terms of service v3\.1, accepted 38 times\.$/),
    ).toBeInTheDocument();
    // The header, the four versions in force and the draft.
    expect((await tableNamed(LEGAL)).getAllByRole('row')).toHaveLength(6);
  });

  it('marks a retired version in another language by its code in capitals, in the earlier versions line', async () => {
    // Consents may still point at a version kept from before English became the only language (decision 039).
    (await storefrontStore()).legal.insert({
      type: 'terms',
      version: '3.0',
      locale: 'tr',
      bodyMd: '# Terms',
      effectiveFrom: '2025-06-01T00:00:00.000Z',
      isCurrent: false,
      requiresReacceptance: false,
      createdAt: '2025-06-01T00:00:00.000Z',
      acceptedCount: 14,
    });
    const user = userEvent.setup();
    await openContent(user);
    expect(
      await screen.findByText(
        /^Earlier versions kept for the record: Terms of service v3\.1, accepted 38 times; Terms of service v3\.0 \(retired TR text\), accepted 14 times\.$/,
      ),
    ).toBeInTheDocument();
    // It is history only: the table lists no row for it.
    expect((await tableNamed(LEGAL)).getAllByRole('row')).toHaveLength(6);
  });

  it('asks before it publishes, says what changes, and puts the draft in force', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'Publish Refund policy v1.5' }));
    const dialog = dialogOf('Publish a new version?');
    expect(dialog.getByText(/^Refund policy goes from v1\.4 to/)).toBeInTheDocument();
    expect(dialog.getByText('v1.5', { selector: 'strong' })).toBeInTheDocument();
    expect(
      dialog.getByText(
        'It appears in later consents, and customers are asked to accept it again at their next order. Orders already placed keep the version they accepted.',
      ),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Publish v1.5' }));
    expect(await screen.findByText('Refund policy updated')).toBeInTheDocument();
    expect(screen.getByText('Version 1.5 is now in force.')).toBeInTheDocument();
    await waitFor(async () => {
      const row = await rowOf(LEGAL, 'v1.5');
      expect(row.getByRole('button', { name: 'New version of Refund policy v1.5' })).toBeInTheDocument();
    });
    expect(screen.getByText(/Refund policy v1\.4/)).toBeInTheDocument();
  });

  it('changes nothing when the confirm is cancelled', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'Publish Refund policy v1.5' }));
    await user.click(dialogOf('Publish a new version?').getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish Refund policy v1.5' })).toBeInTheDocument();
  });

  it('shows the server’s refusal in the confirm dialog and keeps it open', async () => {
    mockServer.use(
      http.post('*/admin/legal-documents/:id/publish', () =>
        problem(
          409,
          'REVIEW_REQUIRED',
          'Needs a second approval',
          'A second admin must approve this text first.',
        ),
      ),
    );
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'Publish Refund policy v1.5' }));
    const dialog = dialogOf('Publish a new version?');
    await user.click(dialog.getByRole('button', { name: 'Publish v1.5' }));
    expect(await dialog.findByText(/A second admin must approve this text first\./)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Publish a new version?' })).toBeInTheDocument();
  });

  it('writes a new version from a document: its type is fixed, the next number and the text are suggested', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'New version of Terms of service v3.2' }));
    const dialog = dialogOf('New version');
    expect(dialog.getByRole('combobox', { name: 'Document' })).toBeDisabled();
    expect(dialog.getByRole('combobox', { name: 'Document' })).toHaveValue('terms');
    expect(dialog.queryByRole('combobox', { name: 'Language' })).not.toBeInTheDocument();
    // The version is not typed: it is the next number, shown as a plain value.
    expect(dialog.queryByRole('textbox', { name: 'Version' })).not.toBeInTheDocument();
    expect(dialog.getByRole('group', { name: 'Version' })).toHaveTextContent('3.3');
    expect(dialog.getByRole('textbox', { name: 'Text (Markdown)' })).toHaveValue(
      '# Terms of service v3.2\n\nText for Terms of service v3.2 goes here.',
    );
    expect(
      dialog.getByRole('checkbox', { name: 'Customers must accept it again at their next order' }),
    ).toBeChecked();
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await screen.findByText('Terms of service v3.3 saved')).toBeInTheDocument();
    expect(screen.getByText('It is not in force yet. Publish it when it is ready.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Publish Terms of service v3.3' })).toBeInTheDocument();
  });

  it('suggests the next free number even when started from the version in force and a later draft exists', async () => {
    // Terms v3.2 is in force and a draft v3.3 is waiting: the row of v3.2 must not offer 3.3 again (the server answers 409).
    (await storefrontStore()).legal.insert({
      type: 'terms',
      version: '3.3',
      locale: 'en',
      bodyMd: '# Terms draft',
      effectiveFrom: null,
      isCurrent: false,
      requiresReacceptance: true,
      createdAt: new Date().toISOString(),
      acceptedCount: null,
    });
    const user = userEvent.setup();
    await openContent(user);
    const requests = recordRequests();
    await user.click(await screen.findByRole('button', { name: 'New version of Terms of service v3.2' }));
    const dialog = dialogOf('New version');
    expect(dialog.getByRole('group', { name: 'Version' })).toHaveTextContent('3.4');
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await screen.findByText('Terms of service v3.4 saved')).toBeInTheDocument();
    const posts = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname.endsWith('/admin/legal-documents'));
    expect(posts.map((sent) => sent.body)).toMatchObject([{ type: 'terms', version: '3.4' }]);
  });

  it('suggests the next number of the document picked in the menu and sends it as it is', async () => {
    const user = userEvent.setup();
    await openContent(user);
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'New version…' }));
    const dialog = dialogOf('New version');
    const menu = dialog.getByRole('combobox', { name: 'Document' });
    expect(menu).toBeEnabled();
    expect(dialog.getByRole('group', { name: 'Version' })).toHaveTextContent('3.3');
    await user.selectOptions(menu, 'Refund policy');
    expect(dialog.getByRole('group', { name: 'Version' })).toHaveTextContent('1.6');
    await user.type(dialog.getByRole('textbox', { name: 'Text (Markdown)' }), '# Refunds');
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await screen.findByText('Refund policy v1.6 saved')).toBeInTheDocument();
    const posts = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname.endsWith('/admin/legal-documents'));
    expect(posts.map((sent) => sent.body)).toEqual([
      { type: 'refund', version: '1.6', bodyMd: '# Refunds', requiresReacceptance: true },
    ]);
  });

  it('shows the server’s refusal of a version number under the Version value', async () => {
    mockServer.use(
      http.post('*/admin/legal-documents', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'version', message: 'Version 3.3 already exists for this document.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'New version…' }));
    const dialog = dialogOf('New version');
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await dialog.findByText('Enter the text of the document.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Text (Markdown)' }), '# Terms');
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await dialog.findByText('Version 3.3 already exists for this document.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New version' })).toBeInTheDocument();
  });
});
