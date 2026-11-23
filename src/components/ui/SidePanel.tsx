// SidePanel: a non-modal <aside> for one item beside the page, its self-saving sections and the layout that places it.
// Never a <dialog>: the console's global shortcuts are off while any dialog[open] exists and must keep working here.
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Button } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';

export interface SidePanelProps {
  title: ReactNode;
  /** Muted line under the title. */
  sub?: ReactNode;
  /** Badges and tags shown right of the title. */
  badges?: ReactNode;
  /** Asked for by Escape (with focus inside the panel) and the close button. The parent unmounts the panel. */
  onClose: () => void;
  closeLabel?: string;
  /** Sticky action bar at the bottom. */
  footer?: ReactNode;
  /** Scrolling body: normally a stack of SidePanelSection. */
  children: ReactNode;
  className?: string;
}

/**
 * A labelled complementary region with a header (title, sub line, badges, close button), a scrolling body and an
 * optional footer. It is not a dialog: nothing is trapped and the page behind stays usable. When it mounts, focus moves
 * to its heading so keyboard and screen-reader users land in it; key it by the opened item to do that again for the next
 * item. Escape closes it only while focus is inside it.
 */
export function SidePanel({
  title,
  sub,
  badges,
  onClose,
  closeLabel = 'Close',
  footer,
  children,
  className,
}: SidePanelProps) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // A section that is already active when the panel opens (a deep link) has taken focus before this runs: keep it.
  useEffect(() => {
    if (panel.current?.contains(document.activeElement)) return;
    heading.current?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    // React also forwards keys typed in a portalled child (a dialog opened from a section) up the tree: only keys
    // typed inside the panel's own DOM count.
    if (!e.currentTarget.contains(e.target as Node)) return;
    // Handled here: if the close opens a modal (a question about unsaved changes), the same key press must not also reach it, or
    // the browser would take it as Escape for the dialog and dismiss it at once.
    e.preventDefault();
    onClose();
  }

  // The height cap belongs to the sticky layout of 2xl; below it the panel is as tall as its content and only the page scrolls once.
  return (
    <aside
      ref={panel}
      className={cx('panel flex flex-col 2xl:max-h-[calc(100dvh-5rem)]', className)}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
    >
      <div className="drawer-h">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 ref={heading} id={titleId} tabIndex={-1} className="text-lg font-semibold">
              {title}
            </h2>
            {badges}
          </div>
          {sub && <p className="mt-0.5 text-xs text-ink3">{sub}</p>}
        </div>
        <Button variant="ghost" icon aria-label={closeLabel} onClick={() => onClose()}>
          <Icon name="x" />
        </Button>
      </div>
      <div className="drawer-b">{children}</div>
      {footer && <div className="drawer-f">{footer}</div>}
    </aside>
  );
}

export interface SidePanelSectionProps {
  /** Becomes the element id, so an address can point at the section. */
  id: string;
  title: string;
  /** Control at the right of the section title (a link, a small button). */
  action?: ReactNode;
  /** When it turns true the section scrolls itself into view and moves focus to its heading. */
  active?: boolean;
  /**
   * Mounts the content again when this value changes (a save made what it shows stale). If focus was inside the content when it
   * went, it moves to the section's heading, so a keyboard or screen-reader user is not left on the page body.
   */
  contentKey?: string | number;
  children: ReactNode;
}

/**
 * One part of a SidePanel, labelled by its heading and separated from the next by a hairline. It is not a .panel:
 * panels are never nested. Each section saves by itself (see FormSection).
 */
export function SidePanelSection({
  id,
  title,
  action,
  active = false,
  contentKey,
  children,
}: SidePanelSectionProps) {
  const headingId = useId();
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Set when content that held focus is taken away; the key says which content it was (a repeated mount of the same one in
  // development must not count).
  const focusLost = useRef<{ from: string | number | undefined } | null>(null);

  // A ref callback that returns a cleanup: React runs it before the content leaves the page, while focus is still in it.
  const watchContent = useCallback(
    (content: HTMLDivElement | null) => {
      if (!content) return;
      return () => {
        focusLost.current = content.contains(document.activeElement) ? { from: contentKey } : null;
      };
    },
    [contentKey],
  );

  useLayoutEffect(() => {
    const lost = focusLost.current;
    if (!lost || lost.from === contentKey) return;
    focusLost.current = null;
    heading.current?.focus({ preventScroll: true });
  }, [contentKey]);

  useEffect(() => {
    if (!active) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Optional call: not every environment has scrollIntoView (jsdom does not).
    section.current?.scrollIntoView?.({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    // preventScroll, or the focus would cut the smooth scroll short.
    heading.current?.focus({ preventScroll: true });
  }, [active]);

  return (
    <section
      ref={section}
      id={id}
      aria-labelledby={headingId}
      className="mb-5 border-b border-line pb-5 last:mb-0 last:border-b-0 last:pb-0"
    >
      <div className="mb-3 flex items-center gap-2">
        <h3 ref={heading} id={headingId} tabIndex={-1} className="min-w-0 flex-1 text-sm font-semibold">
          {title}
        </h3>
        {action}
      </div>
      <div key={contentKey} ref={watchContent}>
        {children}
      </div>
    </section>
  );
}

export interface SidePanelLayoutProps {
  /** The SidePanel to show beside the main area, or null for none. */
  panel: ReactNode | null;
  /** The main area, for example a table. */
  children: ReactNode;
}

/**
 * Places the main area and the panel. From 2xl they sit side by side (panel 440 to 520px, the main area takes the
 * rest). Below 2xl, while a panel is shown, the main area is display:none (so it is not focusable) and the panel takes
 * its place. With no panel only the main area shows. The main area keeps its place in the tree, so opening and closing
 * the panel never remounts it (a table keeps its scroll and selection; the page puts focus back where it was).
 */
export function SidePanelLayout({ panel, children }: SidePanelLayoutProps) {
  const open = panel != null && panel !== false;
  return (
    <div
      className={cx(
        'min-w-0',
        open && '2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(27.5rem,32.5rem)] 2xl:items-start 2xl:gap-4',
      )}
    >
      <div className={cx('min-w-0', open && 'hidden 2xl:block')}>{children}</div>
      {open && <div className="min-w-0 2xl:sticky 2xl:top-16">{panel}</div>}
    </div>
  );
}
