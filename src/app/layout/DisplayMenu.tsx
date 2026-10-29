// DisplayMenu: the topbar menu for theme and row density. It is the "Display" section of the demo's demo-menu
// (90-app.js); the demo's data-state switcher and simulations are not ported.
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { usePreferences, type Theme } from './preferences';

const THEMES: readonly (readonly [Theme, string])[] = [
  ['system', 'Theme: system'],
  ['light', 'Theme: light'],
  ['dark', 'Theme: dark'],
];

export function DisplayMenu() {
  const pop = usePopover();
  const { theme, setTheme, dense, setDense } = usePreferences();

  const items: MenuItem[] = [
    { header: 'Display' },
    ...THEMES.map(([value, label]) => ({ label, checked: theme === value, run: () => setTheme(value) })),
    { label: 'Compact rows', checked: dense, run: () => setDense(!dense) },
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
