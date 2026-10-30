// AuthShell: the frame every sign-in screen shares (sign in, two-step code and setup, choose a password, blocked
// access): one opaque card over the silk artwork, the wordmark in the top-left corner and a quiet footer. Ports the
// demo's login screens into the design of docs/login-design.md.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { version } from '../../../../package.json';
import { WaveBackground } from '../wave/WaveBackground';

/** Development builds name themselves in the footer, so a screenshot of a test console never passes for production. */
const DEV_BADGE = import.meta.env.DEV
  ? import.meta.env.VITE_API_MOCKS === 'true'
    ? 'Development · mock data'
    : 'Development'
  : undefined;

/**
 * The card's spot. Wide screens: centred across, and its top edge where a typical card would sit if centred (a bit
 * above the middle), so an error box grows the card downwards and every step's heading stays in the same place.
 * Phones: top-aligned, its top edge 64px above the end of the artwork band (the band's height is set in
 * WaveCanvas), so the card overlaps the silk as it does on desktop.
 */
const MAIN_CLASS =
  'relative flex flex-1 flex-col px-5 pt-[calc(clamp(240px,68vw,330px)-64px)] md:min-h-dvh md:items-center md:px-8 md:pb-24 md:pt-[max(6rem,calc(50dvh-13rem))]';

/** White card, hairline border, a tight shadow plus a wide faint one; softer corners than panels (12px). */
const CARD_CLASS =
  'relative mx-auto w-full max-w-[400px] rounded-xl border border-line bg-surface px-6 py-7 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_40px_-16px_rgb(0_0_0/0.22)] md:p-9';

export interface AuthShellProps {
  /** The card's heading and the tab title. */
  title: string;
  /** Helper text under the heading. A plain string becomes one paragraph. */
  intro?: ReactNode;
  /** Shown above the heading, such as the symbol of a blocked-access screen. */
  icon?: ReactNode;
  children?: ReactNode;
  /** The one way back, at the bottom of the card (see BackToSignIn). */
  footer?: ReactNode;
  /** Moves focus to the heading on arrival, for screens that replace a form, so a screen reader starts at the news. */
  focusTitle?: boolean;
}

/** The page: artwork, wordmark, the card with its heading and content, and the footer. */
export function AuthShell({ title, intro, icon, children, footer, focusTitle = false }: AuthShellProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · GSM Supply`;
  }, [title]);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-bg">
      <WaveBackground />
      <header className="absolute inset-x-0 top-0 z-10 px-5 pt-5 md:px-8 md:pt-7">
        <AuthWordmark />
      </header>
      <main className={MAIN_CLASS}>
        <section aria-labelledby={titleId} className={CARD_CLASS}>
          {icon}
          {/* Focused by code only, never by Tab, so no ring is drawn around the text. */}
          <h1
            id={titleId}
            ref={titleRef}
            tabIndex={focusTitle ? -1 : undefined}
            className="text-2xl font-semibold tracking-[-0.01em] text-ink outline-none md:text-[24px] md:leading-[30px]"
          >
            {title}
          </h1>
          {intro && (
            <div className="mt-1.5 text-base text-ink2">
              {typeof intro === 'string' ? <p>{intro}</p> : intro}
            </div>
          )}
          {children && <div className="mt-6">{children}</div>}
          {footer && <div className="mt-3">{footer}</div>}
        </section>
      </main>
      <AuthFooter />
    </div>
  );
}

/** The console's mark and name, as in the sidebar, so the sign-in screens and the console share one identity. */
function AuthWordmark() {
  return (
    <p className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-2xs font-semibold text-surface"
      >
        GS
      </span>
      <span className="text-[15px] font-semibold leading-5 text-ink">GSM Supply</span>
      <span className="font-mono text-xs text-ink3">admin</span>
    </p>
  );
}

/** Product and version, plus the environment badge in development builds only. */
function AuthFooter() {
  return (
    <footer className="relative flex flex-wrap items-center gap-x-2.5 gap-y-1 px-5 py-6 text-xs text-ink3 md:absolute md:inset-x-0 md:bottom-0 md:px-8">
      <span>GSM Supply admin console · v{version}</span>
      {DEV_BADGE && <span className="badge b-neutral">{DEV_BADGE}</span>}
    </footer>
  );
}
