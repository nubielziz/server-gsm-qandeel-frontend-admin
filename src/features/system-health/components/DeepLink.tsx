// DeepLink: an "Open in Grafana / Sentry / Bull Board" link that exists only when its address is set in the env.
// No demo screen (docs/system-health-design.md, "Deep links"). Unset means no link, never a dead one.
import type { ReactNode } from 'react';
import { Icon, cx } from '@/components/ui';
import { DEEP_LINK_NAME, deepLinkUrl, type DeepLinkTarget } from '../lib';

export interface DeepLinkProps {
  to: DeepLinkTarget;
  /** Added to the configured address ("queue/dispatch" for Bull Board). A full http(s) address is used as it is. */
  path?: string | null;
  /** Link text. Default: "Open in <tool>". */
  children?: ReactNode;
  /** `link` is text (the header); `button` is a small ghost button (a table row). */
  variant?: 'link' | 'button';
  className?: string;
}

/** Opens in a new tab and says so for screen readers. Renders nothing while the tool's address is not configured. */
export function DeepLink({ to, path, children, variant = 'link', className }: DeepLinkProps) {
  const href = deepLinkUrl(to, path);
  if (!href) return null;
  return (
    <a
      className={cx(
        variant === 'button' ? 'btn btn-ghost btn-sm' : 'link inline-flex items-center gap-1 text-xs',
        className,
      )}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children ?? `Open in ${DEEP_LINK_NAME[to]}`}
      <Icon name="ext" className="ic-xs" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
