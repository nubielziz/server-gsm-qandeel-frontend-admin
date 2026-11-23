// Tests for the Catalog table view where it owns the Add services host: a service of one's own that is made while the open panel holds
// unsaved changes asks "Discard your unsaved changes?" before the panel moves to it, and moves at once when nothing is unsaved. A
// stand-in section (a text box that reports itself dirty) takes the place of the real Details section. They run with the real
// providers against the dev mock API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { listServices } from '../../api';
import { useServiceGrants } from '../../hooks/useServiceGrants';
import type { PanelSectionSpec } from '../../lib/panelSections';
import type { AddServicesDialogComponent } from './AddServicesHost';
import { CatalogTableView } from './CatalogTableView';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

// The section list with the stand-in in the place of the real "Details" section.
vi.mock('../../lib/panelSections', async (importOriginal) => {
  const actual = await importOriginal<{ PANEL_SECTIONS: readonly PanelSectionSpec[] }>();
  const { DraftSection } = await import('../../test/DraftSection');
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
const QUESTION = 'Discard your unsaved changes?';

/** The Add services dialog, reduced to the one way out these tests use. */
const StubDialog: AddServicesDialogComponent = ({ open, onOwnService }) =>
  open ? (
    <div role="dialog" aria-label="Add services">
      <button type="button" onClick={onOwnService}>
        A service of my own
      </button>
    </div>
  ) : null;

/** The view as the page mounts it, once the staff member's permissions are known. */
function Page() {
  const grants = useServiceGrants();
  if (!grants.ready) return null;
  return <CatalogTableView grants={grants} onOpenView={() => {}} addDialog={StubDialog} />;
}

async function openView(route: string) {
  await signInAs();
  const app = renderShell(route, <Route path="/catalog" element={<Page />} />);
  await screen.findByRole('complementary', { name: ATT });
  return app;
}

/** Goes through Add services, A service of my own and the New service form, and presses Create service. */
async function createOwnService(user: UserEvent, code: string) {
  await user.click(screen.getByRole('button', { name: 'Add services' }));
  await user.click(await screen.findByRole('button', { name: 'A service of my own' }));
  const form = within(await screen.findByRole('dialog', { name: 'New service' }));
  await form.findByRole('option', { name: 'Apple' });
  await user.type(form.getByRole('textbox', { name: 'Name' }), `Own ${code}`);
  await user.type(form.getByRole('textbox', { name: 'Code' }), code);
  await user.selectOptions(form.getByRole('combobox', { name: 'Category' }), 'Apple');
  await user.type(form.getByRole('textbox', { name: 'Base price (USD)' }), '3');
  await user.click(form.getByRole('button', { name: 'Create service' }));
  return async () => (await listServices({ q: code })).data[0];
}

describe('a service of my own, made while the panel is open', () => {
  it('asks first when a section holds unsaved changes, and moves to the new service on Discard changes', async () => {
    const user = userEvent.setup();
    const app = await openView('/catalog?open=5');
    await user.type(screen.getByLabelText(`Note for ${ATT}`), 'half-typed');
    const created = await createOwnService(user, 'IMEI-OWN-3');
    await screen.findByRole('dialog', { name: QUESTION });
    expect(app.location()).toBe('/catalog?open=5');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    const made = await created();
    await waitFor(() => expect(app.location()).toBe(`/catalog?open=${made.id}`));
    expect(await screen.findByRole('complementary', { name: made.name })).toBeInTheDocument();
  });

  it('keeps the open service and its text on Keep editing', async () => {
    const user = userEvent.setup();
    const app = await openView('/catalog?open=5');
    await user.type(screen.getByLabelText(`Note for ${ATT}`), 'half-typed');
    await createOwnService(user, 'IMEI-OWN-4');
    await screen.findByRole('dialog', { name: QUESTION });
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: QUESTION })).not.toBeInTheDocument());
    expect(app.location()).toBe('/catalog?open=5');
    expect(screen.getByLabelText(`Note for ${ATT}`)).toHaveValue('half-typed');
  });

  it('moves at once, with no question, when nothing is unsaved', async () => {
    const user = userEvent.setup();
    const app = await openView('/catalog?open=5');
    const created = await createOwnService(user, 'IMEI-OWN-5');
    const made = await created();
    await waitFor(() => expect(app.location()).toBe(`/catalog?open=${made.id}`));
    expect(screen.queryByRole('dialog', { name: QUESTION })).not.toBeInTheDocument();
  });
});
