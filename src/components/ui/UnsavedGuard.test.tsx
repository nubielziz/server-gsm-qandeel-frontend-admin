// Tests for the unsaved-changes question of a record's view: a plain click on a link that leaves the address is held back while something is
// unsaved and goes on only when the staff member agrees; other clicks and links are left alone; the browser asks before a reload.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnsavedGuard } from './UnsavedGuard';

const HERE = '/records?id=7&part=overview';
const OTHER = '/records?id=7&part=settings';

// The address the router is at, as text.
function Where() {
  const { pathname, search } = useLocation();
  return <p>{`At ${pathname}${search}`}</p>;
}

function Page({ active, stays }: { active: boolean; stays?: string }) {
  return (
    <>
      <Where />
      <Link to={HERE}>Overview</Link>
      <Link to={OTHER}>Settings</Link>
      <Link to="/orders" target="_blank">
        Orders in a new tab
      </Link>
      <a href="https://example.com/">Another site</a>
      <UnsavedGuard active={active} what="Overview" stays={stays} />
    </>
  );
}

function open(active: boolean, stays?: string) {
  return render(
    <MemoryRouter initialEntries={[HERE]}>
      <Page active={active} stays={stays} />
    </MemoryRouter>,
  );
}

// jsdom cannot open a page: a click on a link that no handler stopped would log "not implemented". Stop it after every other listener has
// seen it. Only a link's click: stopping every click would also stop the submit of the question's "Discard changes".
const stopNavigation = (event: MouseEvent) => {
  if (event.target instanceof Element && event.target.closest('a[href]')) event.preventDefault();
};
beforeEach(() => document.addEventListener('click', stopNavigation));
afterEach(() => document.removeEventListener('click', stopNavigation));

const question = () => screen.queryByRole('dialog', { name: 'Discard your unsaved changes?' });

describe('while nothing is unsaved', () => {
  it('lets a link move the app at once, with no question', async () => {
    const user = userEvent.setup();
    open(false);
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(screen.getByText(`At ${OTHER}`)).toBeInTheDocument();
    expect(question()).not.toBeInTheDocument();
  });

  it('does not ask the browser before a reload', () => {
    open(false);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('while something is unsaved', () => {
  it('holds a link back and asks, naming the part, and keeps the app where it is', async () => {
    const user = userEvent.setup();
    open(true);
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).toBeInTheDocument();
    expect(
      screen.getByText('You have unsaved changes in Overview. If you go on, they are lost.'),
    ).toBeInTheDocument();
    expect(screen.getByText(`At ${HERE}`)).toBeInTheDocument();
  });

  it('stays where it is on "Keep editing", and asks again on the next click', async () => {
    const user = userEvent.setup();
    open(true);
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(question()).not.toBeInTheDocument();
    expect(screen.getByText(`At ${HERE}`)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).toBeInTheDocument();
  });

  it('goes on to the address of the link on "Discard changes"', async () => {
    const user = userEvent.setup();
    open(true);
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByText(`At ${OTHER}`)).toBeInTheDocument();
    expect(question()).not.toBeInTheDocument();
  });

  it('does not ask for the link to the address the app is at', async () => {
    const user = userEvent.setup();
    open(true);
    await user.click(screen.getByRole('link', { name: 'Overview' }));
    expect(question()).not.toBeInTheDocument();
    expect(screen.getByText(`At ${HERE}`)).toBeInTheDocument();
  });

  it('does not ask for the link to the part that is open under another spelling of its address', async () => {
    const user = userEvent.setup();
    open(true, OTHER);
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(question()).not.toBeInTheDocument();
    expect(screen.getByText(`At ${OTHER}`)).toBeInTheDocument();
  });

  it('leaves alone a modified click, a link that opens a new tab and a link to another site', async () => {
    const user = userEvent.setup();
    open(true);
    await user.keyboard('{Control>}');
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    await user.keyboard('{/Control}');
    await user.click(screen.getByRole('link', { name: 'Orders in a new tab' }));
    await user.click(screen.getByRole('link', { name: 'Another site' }));
    expect(question()).not.toBeInTheDocument();
    expect(screen.getByText(`At ${HERE}`)).toBeInTheDocument();
  });

  it('asks the browser before a reload or a closed tab', () => {
    open(true);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('stops asking once the changes are saved', async () => {
    const user = userEvent.setup();
    const { rerender } = open(true);
    rerender(
      <MemoryRouter initialEntries={[HERE]}>
        <Page active={false} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(question()).not.toBeInTheDocument();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
