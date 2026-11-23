// Tests for the panel's Details section, mounted on its own beside a stand-in that reads the service and shows what the section
// reports. They run against the dev mock API: the form, the save in place, the dirty report, the permissions and "New category…".
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState } from 'react';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidePanelSection } from '@/components/ui';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { getService, listCategories } from '../../../api';
import { useServiceDetail } from '../../../hooks/useServiceDetail';
import { useServiceGrants } from '../../../hooks/useServiceGrants';
import { recordRequests } from '../../../test/requests';
import { DetailsSection } from './DetailsSection';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const EE_UK = 9; // "EE UK Unlock", in the category Carrier unlock

/** The panel's stand-in: reads the service, mounts the section in the panel's frame, says what it reports, and can take the section away. */
function Host() {
  const { detail } = useServiceDetail(EE_UK);
  const grants = useServiceGrants();
  const [dirty, setDirty] = useState(false);
  const [shown, setShown] = useState(true);
  if (!detail || !grants.ready) return <p>Loading the service</p>;
  return (
    <>
      {shown && (
        <SidePanelSection id="service-panel-details" title="Details">
          <DetailsSection service={detail} grants={grants} active={false} onDirtyChange={setDirty} />
        </SidePanelSection>
      )}
      <p>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</p>
      <button onClick={() => setShown(false)}>Remove the section</button>
    </>
  );
}

/** Signs in (with fewer permissions when given), mounts the host and returns the section once its category names have loaded. */
async function openDetails(permissions?: string[]) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  renderShell('/probe', <Route path="/probe" element={<Host />} />);
  const section = within(await screen.findByRole('region', { name: 'Details' }));
  await section.findByRole('option', { name: 'Apple' });
  return section;
}

/** Clears a box and types into it. */
async function retype(user: ReturnType<typeof userEvent.setup>, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

const patches = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((sent) => sent.method === 'PATCH');

describe('the form', () => {
  it('shows the service, takes no focus, and has no supplier note and no price box', async () => {
    const section = await openDetails();
    const name = section.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('EE UK Unlock');
    expect(name).not.toHaveFocus();
    expect(section.getByRole('textbox', { name: 'Code' })).toHaveValue('IMEI-EE-UK');
    expect(section.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Carrier unlock');
    expect(section.getByRole('radio', { name: /^One per order/ })).toBeChecked();
    expect(section.queryByRole('textbox', { name: 'Base price (USD)' })).not.toBeInTheDocument();
    expect(section.queryByText(/Suppliers are linked on the Suppliers page/)).not.toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
  });

  it('puts the smallest and largest quantity on their own lines', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    await user.click(section.getByRole('radio', { name: /^A range/ }));
    const grid = section.getByRole('textbox', { name: 'Smallest' }).closest('.grid');
    expect(grid).not.toBeNull();
    expect(grid).not.toHaveClass('sm:grid-cols-2');
  });
});

describe('saving in place', () => {
  it('reports the change, sends only what changed, then shows the saved values as clean', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    const requests = recordRequests();
    const sla = section.getByRole('textbox', { name: 'SLA (minutes)' });
    const original = (sla as HTMLInputElement).value;
    await retype(user, sla, '90');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(section.getByRole('button', { name: 'Save changes' }));
    expect(await section.findByText('Saved')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(1);
    expect(patches(requests)[0].body).toEqual({ slaMinutes: 90 });
    expect((await getService(EE_UK)).slaMinutes).toBe(90);
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(section.getByRole('textbox', { name: 'SLA (minutes)' })).toHaveValue('90');
    await waitFor(() => expect(section.getByRole('button', { name: 'Save changes' })).toBeDisabled());

    // The next save compares with what was just saved, so going back to the first value is a change.
    await retype(user, section.getByRole('textbox', { name: 'SLA (minutes)' }), original);
    await user.click(section.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(patches(requests)).toHaveLength(2));
    expect(patches(requests)[1].body).toEqual({ slaMinutes: Number(original) });
  });

  it('says nothing changed, shows no "Saved" and sends nothing when the only change is a stray space', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    const requests = recordRequests();
    await user.type(section.getByRole('textbox', { name: 'Name' }), ' ');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(section.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(0);
    expect(section.queryByText('Saved')).not.toBeInTheDocument();
    // The form shows the saved name again and holds nothing unsaved.
    expect(section.getByRole('textbox', { name: 'Name' })).toHaveValue('EE UK Unlock');
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
  });

  it('shows the server’s refusal under the field it names and stays unsaved', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    await retype(user, section.getByRole('textbox', { name: 'Code' }), 'IMEI-ATT-USA');
    await user.click(section.getByRole('button', { name: 'Save changes' }));
    expect(
      await section.findByText('The code IMEI-ATT-USA is already used by AT&T USA Premier Unlock.'),
    ).toBeInTheDocument();
    expect(section.getByRole('textbox', { name: 'Code' })).toHaveAttribute('aria-invalid', 'true');
    expect(section.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect((await getService(EE_UK)).code).toBe('IMEI-EE-UK');
  });

  it('checks the fields before it calls the server', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    const requests = recordRequests();
    await user.clear(section.getByRole('textbox', { name: 'Name' }));
    await user.click(section.getByRole('button', { name: 'Save changes' }));
    expect(await section.findByText('Enter a name.')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(0);
  });

  it('says the section holds nothing unsaved once it is gone', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    await retype(user, section.getByRole('textbox', { name: 'SLA (minutes)' }), '45');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove the section' }));
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('locks the fields and names the missing permission on the button for a reader', async () => {
    const section = await openDetails(['catalog:read']);
    expect(section.getByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(section.getByRole('combobox', { name: 'Category' })).toBeDisabled();
    expect(section.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(section.getByText('You need the catalog:update permission')).toBeInTheDocument();
  });

  it('keeps "New category…" off, with its reason, without catalog:create', async () => {
    const user = userEvent.setup();
    const section = await openDetails(['catalog:read', 'catalog:update']);
    const make = section.getByRole('button', { name: 'New category…' });
    expect(make).toBeDisabled();
    expect(make).toHaveAttribute('title', 'You need the catalog:create permission');
    await retype(user, section.getByRole('textbox', { name: 'SLA (minutes)' }), '45');
    expect(section.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });
});

describe('New category…', () => {
  it('asks for a name, makes the category with the chosen type, selects it and saves it with the service', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    const last = Math.max(
      ...(await listCategories({ start: 0, end: 200 })).data.map((category) => category.sort),
    );
    const requests = recordRequests();
    await user.selectOptions(section.getByRole('combobox', { name: 'Type' }), 'Server');
    await user.click(section.getByRole('button', { name: 'New category…' }));
    const step = within(section.getByRole('group', { name: 'New category' }));
    expect(step.getByRole('textbox', { name: 'Category name' })).toHaveFocus();
    await user.type(step.getByRole('textbox', { name: 'Category name' }), 'Fresh category{Enter}');

    expect(await section.findByRole('option', { name: 'Fresh category' })).toBeInTheDocument();
    expect(section.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Fresh category');
    expect(section.queryByRole('group', { name: 'New category' })).not.toBeInTheDocument();
    const posts = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname.endsWith('/admin/service-categories'));
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({
      name: 'Fresh category',
      type: 'server',
      allowedGroupIds: [],
      sort: last + 1,
      isActive: true,
    });
    // Enter went to the step, not to the form around it: the service is not saved yet.
    expect(patches(requests)).toHaveLength(0);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await user.click(section.getByRole('button', { name: 'Save changes' }));
    expect(await section.findByText('Saved')).toBeInTheDocument();
    const saved = await getService(EE_UK);
    expect(saved.category?.name).toBe('Fresh category');
    expect(saved.type).toBe('server');
  });

  it('shows the server’s words when it refuses, and keeps the step and the old choice', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/service-categories', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'That name is reserved.' },
        ]),
      ),
    );
    const section = await openDetails();
    await user.click(section.getByRole('button', { name: 'New category…' }));
    const step = within(section.getByRole('group', { name: 'New category' }));
    await user.type(step.getByRole('textbox', { name: 'Category name' }), 'Reserved');
    await user.click(step.getByRole('button', { name: 'Create category' }));
    expect(await step.findByText('That name is reserved.')).toBeInTheDocument();
    expect(step.getByRole('textbox', { name: 'Category name' })).toHaveAttribute('aria-invalid', 'true');
    expect(section.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Carrier unlock');
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
  });

  it('asks for a name before it calls the server, and Cancel and Escape close the step', async () => {
    const user = userEvent.setup();
    const section = await openDetails();
    const requests = recordRequests();
    await user.click(section.getByRole('button', { name: 'New category…' }));
    await user.click(section.getByRole('button', { name: 'Create category' }));
    expect(await section.findByText('Enter a name for the category.')).toBeInTheDocument();
    expect(requests.sent().filter((sent) => sent.method === 'POST')).toHaveLength(0);

    await user.click(section.getByRole('button', { name: 'Cancel' }));
    expect(section.queryByRole('group', { name: 'New category' })).not.toBeInTheDocument();
    expect(section.getByRole('button', { name: 'New category…' })).toHaveFocus();

    await user.click(section.getByRole('button', { name: 'New category…' }));
    await user.keyboard('{Escape}');
    expect(section.queryByRole('group', { name: 'New category' })).not.toBeInTheDocument();
  });
});
