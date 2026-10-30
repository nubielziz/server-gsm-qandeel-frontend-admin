// Tests for the Content and legal tab: the pages and blog table with its publish toggle, the edit and new page dialogs, and the legal
// documents table with New version and the Publish confirm ("it appears in later consents").
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
  it('lists the static pages and blog posts, not the landing pages', async () => {
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
    expect(table.queryByText('Unlock iPhone on AT&T')).not.toBeInTheDocument();
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
    await retype(user, edit.getByRole('textbox', { name: 'Title' }), 'About GSM Supply');
    await user.click(edit.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Page saved')).toBeInTheDocument();
    expect(await rowOf(PAGES, 'About GSM Supply')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'New page…' }));
    const create = dialogOf('New page');
    expect(
      within(create.getByRole('combobox', { name: 'Type' }))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Page', 'Blog post']);
    await user.type(create.getByRole('textbox', { name: 'Title' }), 'Refund guide');
    await user.type(create.getByRole('textbox', { name: 'Text (Markdown)' }), '# Refunds');
    await user.click(create.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Page saved as a draft')).toBeInTheDocument();
    expect((await rowOf(PAGES, 'Refund guide')).getByText('Draft')).toBeInTheDocument();
  });
});

describe('legal documents', () => {
  it('shows the versions in force and the draft waiting to be published, and the earlier versions as a line', async () => {
    const user = userEvent.setup();
    await openContent(user);
    const table = await tableNamed(LEGAL);
    const terms = within(
      table.getByRole('button', { name: 'New version of Terms of service v3.2 (English)' }).closest('tr')!,
    );
    expect(terms.getByText('v3.2')).toBeInTheDocument();
    expect(terms.getByText('English')).toBeInTheDocument();
    const draft = await rowOf(LEGAL, 'v1.5');
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.getByRole('button', { name: 'Publish Refund policy v1.5 (English)' })).toBeInTheDocument();
    expect(draft.getByText('Not asked')).toBeInTheDocument();
    expect(
      screen.getByText(
        /^Earlier versions kept for the record: Terms of service v3\.1 \(English\), accepted 38 times\.$/,
      ),
    ).toBeInTheDocument();
    expect((await tableNamed(LEGAL)).getAllByRole('row')).toHaveLength(7);
  });

  it('asks before it publishes, says what changes, and puts the draft in force', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'Publish Refund policy v1.5 (English)' }));
    const dialog = dialogOf('Publish a new version?');
    expect(dialog.getByText(/^Refund policy \(English\) goes from v1\.4 to/)).toBeInTheDocument();
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
      expect(
        row.getByRole('button', { name: 'New version of Refund policy v1.5 (English)' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Refund policy v1\.4 \(English\)/)).toBeInTheDocument();
  });

  it('changes nothing when the confirm is cancelled', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'Publish Refund policy v1.5 (English)' }));
    await user.click(dialogOf('Publish a new version?').getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish Refund policy v1.5 (English)' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Publish Refund policy v1.5 (English)' }));
    const dialog = dialogOf('Publish a new version?');
    await user.click(dialog.getByRole('button', { name: 'Publish v1.5' }));
    expect(await dialog.findByText(/A second admin must approve this text first\./)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Publish a new version?' })).toBeInTheDocument();
  });

  it('writes a new version from a document: its type and language are fixed, the next number and the text are suggested', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'New version of Terms of service v3.2 (English)' }));
    const dialog = dialogOf('New version');
    expect(dialog.getByRole('combobox', { name: 'Document' })).toBeDisabled();
    expect(dialog.getByRole('combobox', { name: 'Document' })).toHaveValue('terms');
    expect(dialog.getByRole('textbox', { name: 'Version' })).toHaveValue('3.3');
    expect(dialog.getByRole('textbox', { name: 'Text (Markdown)' })).toHaveValue(
      '# Terms of service v3.2\n\nText for Terms of service v3.2 goes here.',
    );
    expect(
      dialog.getByRole('checkbox', { name: 'Customers must accept it again at their next order' }),
    ).toBeChecked();
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await screen.findByText('Terms of service v3.3 saved')).toBeInTheDocument();
    expect(screen.getByText('It is not in force yet. Publish it when it is ready.')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Publish Terms of service v3.3 (English)' }),
    ).toBeInTheDocument();
  });

  it('shows the server’s refusal of a version number that exists under the Version field', async () => {
    const user = userEvent.setup();
    await openContent(user);
    await user.click(screen.getByRole('button', { name: 'New version…' }));
    const dialog = dialogOf('New version');
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await dialog.findByText('Enter a version number.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Version' }), '3.2');
    await user.type(dialog.getByRole('textbox', { name: 'Text (Markdown)' }), '# Terms');
    await user.click(dialog.getByRole('button', { name: 'Save version' }));
    expect(await dialog.findByText('Version 3.2 already exists for this document.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New version' })).toBeInTheDocument();
  });
});
