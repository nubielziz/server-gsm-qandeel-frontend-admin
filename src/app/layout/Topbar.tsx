// Topbar: the 48px sticky bar with the mobile menu button, breadcrumb, search, display menu and theme toggle.
// Ports renderTopbar() of 90-app.js without the demo's data-state switcher.
import type { RefObject } from 'react';
import { Button, Icon, Kbd } from '@/components/ui';
import { Breadcrumb } from './Breadcrumb';
import { DisplayMenu } from './DisplayMenu';
import { usePreferences } from './preferences';

export interface TopbarProps {
  navOpen: boolean;
  onOpenNav: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenPalette: () => void;
}

export function Topbar({ navOpen, onOpenNav, menuButtonRef, onOpenPalette }: TopbarProps) {
  const { isDark, toggleTheme } = usePreferences();
  return (
    <header
      id="topbar"
      className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-line bg-bg/95 px-3 lg:px-6"
    >
      <Button
        ref={menuButtonRef}
        variant="ghost"
        icon
        className="lg:hidden"
        aria-label="Open menu"
        aria-controls="sidebar"
        aria-expanded={navOpen}
        onClick={onOpenNav}
      >
        <Icon name="menu" />
      </Button>
      <Breadcrumb />
      <div className="flex-1" />
      <button
        type="button"
        className="hidden h-8 w-full max-w-[280px] items-center gap-2 rounded-md border border-line2 bg-surface px-2.5 text-sm text-ink3 hover:border-ink3 md:flex"
        aria-label="Search or jump to, command palette"
        onClick={onOpenPalette}
      >
        <Icon name="search" className="ic-sm" />
        <span className="flex-1 text-start">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>
      <Button variant="ghost" icon className="md:hidden" aria-label="Search" onClick={onOpenPalette}>
        <Icon name="search" />
      </Button>
      <DisplayMenu />
      <Button variant="ghost" icon aria-label="Toggle colour theme" onClick={toggleTheme}>
        <Icon name={isDark ? 'sun' : 'moon'} />
      </Button>
    </header>
  );
}
