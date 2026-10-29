// Tests for useFocusMainOnNavigation: scroll to top and focus <main> after a route change, like the demo.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFocusMainOnNavigation } from './useFocusMainOnNavigation';

function Harness() {
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  useFocusMainOnNavigation(mainRef);
  return (
    <>
      <button onClick={() => void navigate('/a?tab=2')}>same page, new query</button>
      <button onClick={() => void navigate('/b')}>other page</button>
      <main ref={mainRef} tabIndex={-1} />
    </>
  );
}

function setup() {
  const scrollTo = vi.spyOn(window, 'scrollTo');
  render(
    <MemoryRouter initialEntries={['/a']}>
      <Harness />
    </MemoryRouter>,
  );
  return { scrollTo, user: userEvent.setup() };
}

afterEach(() => vi.restoreAllMocks());

describe('useFocusMainOnNavigation', () => {
  it('does nothing on the first render', () => {
    const { scrollTo } = setup();
    expect(screen.getByRole('main')).not.toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('focuses <main> and scrolls to the top when the path changes', async () => {
    const { scrollTo, user } = setup();
    await user.click(screen.getByRole('button', { name: 'other page' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith(0, 0);
  });

  it('leaves focus and scrolling alone when only the query changes (a tab or filter)', async () => {
    const { scrollTo, user } = setup();
    const button = screen.getByRole('button', { name: 'same page, new query' });
    await user.click(button);
    expect(button).toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
