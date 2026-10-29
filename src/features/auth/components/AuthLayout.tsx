// AuthLayout: the frame of every sign-in screen: the GS mark, a centred 400px panel on the paper background and
// the tab title. No demo screen exists for sign-in (MISMATCHES M5), so it is built from the demo's own pieces.
import { useEffect, type ReactNode } from 'react';

export interface AuthLayoutProps {
  /** The screen's heading (Title type, 22px) and its tab title. */
  title: string;
  /** One line of Body text under the heading. */
  intro?: ReactNode;
  children: ReactNode;
  /** A small centred line under the panel, for the way back ("Back to sign in"). */
  footer?: ReactNode;
}

export function AuthLayout({ title, intro, children, footer }: AuthLayoutProps) {
  useEffect(() => {
    document.title = `${title} · GSM Supply`;
  }, [title]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-xs font-semibold text-surface"
            aria-hidden="true"
          >
            GS
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">GSM Supply</p>
            <p className="text-2xs text-ink3">Admin console</p>
          </div>
        </div>
        <section className="panel p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {intro && <p className="mt-1 text-sm text-ink2">{intro}</p>}
          <div className="mt-5 space-y-3.5">{children}</div>
        </section>
        {footer && <p className="mt-4 text-center text-xs text-ink3">{footer}</p>}
      </div>
    </main>
  );
}
