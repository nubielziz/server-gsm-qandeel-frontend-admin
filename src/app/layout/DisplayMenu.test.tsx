// Tests for the display menu's support switches: they show as checked or not, a click flips them and saves the choice, and turning desktop alerts on shows the
// reason when the browser refuses.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToasts } from '@/components/ui';
import { DisplayMenu } from './DisplayMenu';
import { PreferencesProvider } from './PreferencesProvider';

afterEach(() => vi.unstubAllGlobals());

async function openMenu() {
  const user = userEvent.setup();
  render(
    <PreferencesProvider>
      <DisplayMenu />
    </PreferencesProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Display' }));
  return user;
}

describe('the Support inbox section of the Display menu', () => {
  it('lists the sound (on) and the desktop alerts (off) with their state', async () => {
    await openMenu();
    expect(screen.getByRole('menuitemradio', { name: 'Support sound' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Desktop alerts' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('turns the sound off and saves it', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('menuitemradio', { name: 'Support sound' }));
    expect(localStorage.getItem('gsm-support-sound')).toBe('0');
  });

  it('turns desktop alerts on after the browser agrees', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: () => Promise.resolve('granted'),
    });
    const user = await openMenu();
    await user.click(screen.getByRole('menuitemradio', { name: 'Desktop alerts' }));
    await vi.waitFor(() => expect(localStorage.getItem('gsm-support-desktop')).toBe('1'));
    expect(getToasts()).toEqual([]);
  });

  it('tells the staff member when the browser has not allowed notifications', async () => {
    vi.stubGlobal('Notification', {
      permission: 'denied',
      requestPermission: () => Promise.resolve('denied'),
    });
    const user = await openMenu();
    await user.click(screen.getByRole('menuitemradio', { name: 'Desktop alerts' }));
    await vi.waitFor(() => expect(getToasts()).toHaveLength(1));
    expect(getToasts()[0]).toMatchObject({ kind: 'error', title: 'Desktop alerts are off' });
    expect(localStorage.getItem('gsm-support-desktop')).toBe('0');
  });
});
