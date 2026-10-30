// AuthLayout: the frame of every sign-in screen, the "ledger split" of docs/login-design.md. A quiet form column on
// the left, and on wide screens a ruled sheet on the right that carries the console's real facts. It also sets the
// tab title. No demo screen exists for sign-in (MISMATCHES M5).
import { useEffect, useRef, type ReactNode } from 'react';
import { useAuthEnvironment } from '../hooks/useAuthEnvironment';
import { AuthStatusLine, AuthStatusList } from './AuthStatusLine';

export interface AuthLayoutProps {
  /** The screen's heading (Title type, 22px) and its tab title. */
  title: string;
  /** Body text under the heading. A plain string becomes one paragraph. */
  intro?: ReactNode;
  children?: ReactNode;
  /** A small line under the form, for the way back ("Back to sign in") or a hint. */
  footer?: ReactNode;
  /** Moves focus to the heading on arrival. For screens that replace a form, so a screen reader starts at the answer. */
  focusTitle?: boolean;
}

// Hairline rules every 32px (the 4/8 grid) in the line token, so the sheet follows light and dark.
const RULED_SHEET =
  'bg-[image:repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgb(var(--line))_31px,rgb(var(--line))_32px)]';

export function AuthLayout({ title, intro, children, footer, focusTitle = false }: AuthLayoutProps) {
  const facts = useAuthEnvironment();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · GSM Supply`;
  }, [title]);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-h-dvh flex-col px-6 md:px-12 lg:px-20">
        <header className="pt-6">
          <p className="text-sm font-semibold">
            GSM Supply
            <span className="ms-1.5 font-mono text-xs font-normal text-ink3">/ admin</span>
          </p>
        </header>
        <main className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[380px]">
            {/* Focused by code only, never by Tab, so no ring is drawn around the text. */}
            <h1
              ref={titleRef}
              tabIndex={focusTitle ? -1 : undefined}
              className="text-2xl font-semibold tracking-[-0.01em] outline-none"
            >
              {title}
            </h1>
            {intro && (
              <div className="mt-2 text-sm text-ink2">
                {typeof intro === 'string' ? <p>{intro}</p> : intro}
              </div>
            )}
            {children && <div className="mt-8 space-y-4">{children}</div>}
            {footer && <p className="mt-6 text-xs text-ink3">{footer}</p>}
          </div>
        </main>
        <footer className="border-t border-line py-4 lg:hidden">
          <AuthStatusLine facts={facts} />
        </footer>
      </div>
      <aside
        aria-label="Console status"
        className={`hidden border-s border-line bg-sunken lg:block ${RULED_SHEET}`}
      >
        <div className="sticky top-0 flex h-dvh flex-col justify-end">
          <AuthStatusList facts={facts} className="border-t border-line bg-sunken p-8" />
        </div>
      </aside>
    </div>
  );
}
