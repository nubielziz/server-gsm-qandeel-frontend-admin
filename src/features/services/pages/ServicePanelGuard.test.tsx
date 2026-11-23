// Tests for the unsaved-changes guard of the service panel, through the whole app: while a section holds unsaved changes, picking another
// service, the close button, Escape and every link that leaves the page ask "Discard your unsaved changes?" first, and nothing moves
// until the staff member answers. A stand-in section (a text box that reports itself dirty) takes the place of the real Details
// section, so no real form is needed.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import type { PanelSectionSpec } from '../lib/panelSections';
import { CATALOG_ROUTE, catalogRoute, openServices, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

// The section list with the stand-in in the place of the real "Details" section.
vi.mock('../lib/panelSections', async (importOriginal) => {
  const actual = await importOriginal<{ PANEL_SECTIONS: readonly PanelSectionSpec[] }>();
  const { DraftSection } = await import('../test/DraftSection');
  const draft: PanelSectionSpec = {
    id: 'details',
    title: 'Details',
    show: () => true,
    Component: DraftSection,
    remountOnChange: true,
  };
  return {
    ...actual,
    PANEL_SECTIONS: [draft, ...actual.PANEL_SECTIONS.filter((spec) => spec.id !== 'details')],
  };
});

const ATT = 'AT&T USA Premier Unlock';
const CHIMERA = 'Chimera Tool 1 Month';
const QUESTION = 'Discard your unsaved changes?';

const queryOf = (location: string | null) => (location ?? '').split('?')[1] ?? '';
const noteOf = (name: string) => screen.getByLabelText(`Note for ${name}`);

/** Opens the panel of the first service and types into its note, so its section holds unsaved changes. */
async function openWithDraft(user: UserEvent, route = catalogRoute('open=5')) {
  const app = await openServices(route);
  await screen.findByRole('complementary', { name: ATT });
  await user.type(noteOf(ATT), 'half-typed');
  return app;
}

const noQuestion = () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

describe('picking another service', () => {
  it('asks first, names the section, and keeps everything as it was on Keep editing', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click((await serviceRow(CHIMERA)).getByRole('button', { name: CHIMERA }));
    const question = within(await screen.findByRole('dialog', { name: QUESTION }));
    expect(question.getByText(/unsaved changes in Details/)).toBeInTheDocument();
    expect(queryOf(app.location())).toBe('open=5');
    await user.click(question.getByRole('button', { name: 'Keep editing' }));
    await waitFor(noQuestion);
    expect(queryOf(app.location())).toBe('open=5');
    expect(noteOf(ATT)).toHaveValue('half-typed');
    expect(screen.queryByRole('complementary', { name: CHIMERA })).not.toBeInTheDocument();
  });

  it('goes on to the other service on Discard changes, with a fresh section', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click((await serviceRow(CHIMERA)).getByRole('button', { name: CHIMERA }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByRole('complementary', { name: CHIMERA })).toBeInTheDocument();
    expect(queryOf(app.location())).toBe('open=17');
    expect(noteOf(CHIMERA)).toHaveValue('');
    await waitFor(noQuestion);
    // The new service starts clean: moving on again asks nothing.
    await user.click((await serviceRow(ATT)).getByRole('button', { name: ATT }));
    expect(await screen.findByRole('complementary', { name: ATT })).toBeInTheDocument();
    noQuestion();
  });

  it('does not ask when the staff member only moves to another part of the same service', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('open=17'));
    await screen.findByRole('complementary', { name: CHIMERA });
    await user.type(noteOf(CHIMERA), 'half-typed');
    const panel = within(screen.getByRole('complementary', { name: CHIMERA }));
    await user.click(panel.getByRole('button', { name: 'Below floor' }));
    expect(queryOf(app.location())).toBe('open=17&section=prices');
    noQuestion();
    expect(noteOf(CHIMERA)).toHaveValue('half-typed');
  });
});

describe('closing the panel', () => {
  it('asks before the close button closes it, and closes on Discard changes', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click(screen.getByRole('button', { name: 'Close service' }));
    await screen.findByRole('dialog', { name: QUESTION });
    expect(queryOf(app.location())).toBe('open=5');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    expect(screen.queryByRole('complementary', { name: ATT })).not.toBeInTheDocument();
  });

  it('asks before Escape closes it, and stays open on Keep editing', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.keyboard('{Escape}');
    const question = within(await screen.findByRole('dialog', { name: QUESTION }));
    expect(queryOf(app.location())).toBe('open=5');
    await user.click(question.getByRole('button', { name: 'Keep editing' }));
    await waitFor(noQuestion);
    expect(screen.getByRole('complementary', { name: ATT })).toBeInTheDocument();
    expect(noteOf(ATT)).toHaveValue('half-typed');
  });

  it('does not ask once the changes are gone again', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.clear(noteOf(ATT));
    await user.click(screen.getByRole('button', { name: 'Close service' }));
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    noQuestion();
  });

  it('opens clean the next time, with no memory of the changes that were thrown away', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click(screen.getByRole('button', { name: 'Close service' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    await user.click((await serviceRow(ATT)).getByRole('button', { name: ATT }));
    await screen.findByRole('complementary', { name: ATT });
    expect(noteOf(ATT)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Close service' }));
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    noQuestion();
  });
});

describe('leaving the page', () => {
  /** The question, once it is on screen. */
  const asked = () => screen.findByRole('dialog', { name: QUESTION });

  it('asks before the Catalog settings link leaves, stays on Keep editing and goes on Discard changes', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click(screen.getByRole('link', { name: 'Catalog settings' }));
    const question = within(await asked());
    expect(queryOf(app.location())).toBe('open=5');
    await user.click(question.getByRole('button', { name: 'Keep editing' }));
    await waitFor(noQuestion);
    expect(queryOf(app.location())).toBe('open=5');
    expect(noteOf(ATT)).toHaveValue('half-typed');
    await user.click(screen.getByRole('link', { name: 'Catalog settings' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(queryOf(app.location())).toMatch(/^view=settings/));
  });

  it('goes at once to the Catalog settings when nothing is unsaved', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('open=5'));
    await screen.findByRole('complementary', { name: ATT });
    await user.click(screen.getByRole('link', { name: 'Catalog settings' }));
    await waitFor(() => expect(queryOf(app.location())).toMatch(/^view=settings/));
    noQuestion();
  });

  it('asks before the Publish runs item leaves', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click(screen.getByRole('button', { name: 'More catalog actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Publish runs' }));
    await asked();
    expect(queryOf(app.location())).toBe('open=5');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(queryOf(app.location())).toMatch(/^view=publish/));
  });

  it('asks before the below-floor sentence of the header drops the open service', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    await user.click(await screen.findByRole('link', { name: /priced below cost plus minimum profit/ }));
    await asked();
    expect(queryOf(app.location())).toBe('open=5');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(queryOf(app.location())).toBe('belowFloor=true'));
  });

  it('asks before the links of the Activity section leave', async () => {
    const user = userEvent.setup();
    const app = await openWithDraft(user);
    const panel = within(screen.getByRole('complementary', { name: ATT }));
    await user.click(panel.getByRole('link', { name: 'See orders' }));
    await asked();
    expect(app.location()).toContain('open=5');
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(noQuestion);
    await user.click(panel.getByRole('link', { name: 'Trace a merchant price' }));
    await asked();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(queryOf(app.location())).toMatch(/^view=settings&tab=resolver/));
  });
});

describe('a save made elsewhere in the panel', () => {
  it('keeps the section that holds unsaved changes as it is, and the other sections as they were', async () => {
    const user = userEvent.setup();
    await openWithDraft(user);
    const panel = within(screen.getByRole('complementary', { name: ATT }));
    await user.click(panel.getByRole('switch', { name: `Automation for ${ATT}` }));
    await waitFor(() =>
      expect(panel.getByRole('switch', { name: `Automation for ${ATT}` })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    );
    expect(noteOf(ATT)).toHaveValue('half-typed');
  });
});
