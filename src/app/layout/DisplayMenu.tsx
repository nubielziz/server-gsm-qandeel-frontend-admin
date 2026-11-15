// DisplayMenu: the topbar menu for theme, row density, the notification bell's sound and the support inbox alerts (sound, desktop). It is the
// "Display" section of the demo's demo-menu (90-app.js); the demo's data-state switcher and simulations are not ported. "Notification sound"
// (owner, 2026-11-15) turns the bell's arrival chime on or off for this browser, on by default; the two support alert switches are feature 28's.
import { Button, Icon, Menu, toast, usePopover, type MenuItem } from '@/components/ui';
import { usePreferences, type Theme } from './preferences';

const THEMES: readonly (readonly [Theme, string])[] = [
  ['system', 'Theme: system'],
  ['light', 'Theme: light'],
  ['dark', 'Theme: dark'],
];

export function DisplayMenu() {
  const pop = usePopover();
  const {
    theme,
    setTheme,
    dense,
    setDense,
    notificationSound,
    setNotificationSound,
    supportSound,
    setSupportSound,
    desktopAlerts,
    setDesktopAlerts,
  } = usePreferences();

  // Turning desktop alerts on asks the browser; when it says no, the switch stays off and the staff member is told why.
  async function toggleDesktopAlerts() {
    const on = await setDesktopAlerts(!desktopAlerts);
    if (!desktopAlerts && !on) {
      toast({
        kind: 'error',
        title: 'Desktop alerts are off',
        body: 'This browser has not allowed notifications for the console. Allow them in the site settings, then try again.',
      });
    }
  }

  const items: MenuItem[] = [
    { header: 'Display' },
    ...THEMES.map(([value, label]) => ({ label, checked: theme === value, run: () => setTheme(value) })),
    { label: 'Compact rows', checked: dense, run: () => setDense(!dense) },
    {
      label: 'Notification sound',
      checked: notificationSound,
      run: () => setNotificationSound(!notificationSound),
    },
    { header: 'Support inbox' },
    { label: 'Support sound', checked: supportSound, run: () => setSupportSound(!supportSound) },
    { label: 'Desktop alerts', checked: desktopAlerts, run: () => void toggleDesktopAlerts() },
  ];

  return (
    <>
      <Button
        ref={pop.anchorRef}
        size="sm"
        aria-label="Display"
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="sliders" className="ic-sm" />
        <span className="hidden sm:inline">Display</span>
        <Icon name="chevD" className="ic-xs" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={220} label="Display" />
    </>
  );
}
