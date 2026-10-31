// VerdictPanel: the answer to "is everything OK now?" in three seconds: the overall status with since when, what is broken,
// the open alerts and incidents, and what it costs in orders and money. It reads `GET /admin/system/health`. No data
// is never green: monitoring down or a failed call give a neutral verdict (docs/system-health-design.md, "Layout", "States").
import { useId, type ReactNode } from 'react';
import { Button, ButtonLink, Icon, Skeleton, cx, type BadgeTone } from '@/components/ui';
import { useNow } from '@/lib/format';
import { StaleBadge } from '../components/StaleBadge';
import { POLL, isMonitoringUnavailable, useHealthGrants, useHealthLink, useSystemHealth } from '../hooks';
import { failureOf } from './failure';
import { ImpactLine } from './ImpactLine';
import { VerdictDetails } from './VerdictDetails';
import { STATUS_UNAVAILABLE, seeLink, sinceText, verdictLook, type VerdictLook } from './verdict';

// Full class names so Tailwind's scanner sees them. Status hues only ever appear with an icon and a word.
const TONE_BOX: Record<BadgeTone, string> = {
  good: 'border-good-dot/40 bg-good-bg text-good-fg',
  warn: 'border-warn-dot/50 bg-warn-bg text-warn-fg',
  serious: 'border-serious-dot/50 bg-serious-bg text-serious-fg',
  crit: 'border-crit-dot/50 bg-crit-bg text-crit-fg',
  neutral: 'border-line2 bg-sunken text-ink2',
  accent: 'border-accent/40 bg-accent-soft text-accent-ink',
};

interface FrameProps {
  look: VerdictLook;
  /** The headline's second half ("since 14:02 (38m)"). */
  since?: string | null;
  /** Shortcut button and stale badge on the right of the headline. */
  actions?: ReactNode;
  busy?: boolean;
  children?: ReactNode;
}

/**
 * The tinted box: icon and word in the tone's colour, the detail lines in ink below. On a phone the shortcut button comes
 * last, after the details; from `sm` it sits at the top right.
 */
function Frame({ look, since, actions, busy, children }: FrameProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className={cx(
        'mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-lg border p-3.5 sm:px-4',
        TONE_BOX[look.tone],
      )}
    >
      <h2
        id={headingId}
        className="order-1 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-lg font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          <Icon name={look.icon} className="flex-none self-center" />
          {look.word}
        </span>
        {/* A flex container draws no space between its items, but the text of the heading should have one. */}{' '}
        {since && <span className="text-sm font-normal">{since}</span>}
      </h2>
      {actions && <div className="order-3 flex flex-wrap items-center gap-2 sm:order-2">{actions}</div>}
      {children && <div className="order-2 basis-full space-y-1 text-sm text-ink sm:order-3">{children}</div>}
    </section>
  );
}

/**
 * Four states. Loading: a neutral box with grey lines. Answer: tone and word from the server's status, plus the detail lines
 * and the order impact line (a failed refresh keeps them and adds a "Stale" badge). Monitoring down (503): neutral
 * "Monitoring unavailable". Any other failure: neutral "Status unavailable" with the server's reason and Retry.
 */
export function VerdictPanel() {
  const grants = useHealthGrants();
  const health = useSystemHealth();
  const link = useHealthLink();
  const now = useNow(30_000);
  const { data } = health;

  if (data) {
    const look = verdictLook(data.status, data.monitoring.status === 'unavailable');
    const see = seeLink(data, grants.can, link);
    const stale = (
      <StaleBadge
        updatedAt={health.dataUpdatedAt}
        interval={POLL.fast}
        failed={health.isError}
        reason={health.isError ? failureOf(health.error).title : undefined}
        fetching={health.isFetching}
        onRetry={() => void health.refetch()}
      />
    );
    return (
      <Frame
        look={look}
        since={sinceText(data.since, now)}
        actions={
          <>
            {stale}
            {see && (
              <ButtonLink to={see.to} size="sm">
                {see.label}
              </ButtonLink>
            )}
          </>
        }
      >
        <VerdictDetails health={data} grants={grants} now={now} />
        <ImpactLine />
      </Frame>
    );
  }

  if (health.isPending && !health.isError) {
    return (
      <Frame look={{ tone: 'neutral', icon: 'info', word: 'Checking status…' }} busy>
        <div role="status" aria-label="Loading status" className="space-y-2 py-1">
          <Skeleton width="60%" height={12} />
          <Skeleton width="40%" height={12} />
        </div>
      </Frame>
    );
  }

  const failure = failureOf(health.error);
  const unavailable = isMonitoringUnavailable(health.error);
  return (
    <Frame
      look={
        unavailable
          ? { ...STATUS_UNAVAILABLE, icon: 'pulse', word: 'Monitoring unavailable' }
          : STATUS_UNAVAILABLE
      }
      actions={
        <Button size="sm" onClick={() => void health.refetch()} loading={health.isFetching}>
          Retry
        </Button>
      }
    >
      <p>{failure.detail ?? failure.title}</p>
      {failure.requestId && (
        <p className="text-xs text-ink3">
          Request <span className="mono">{failure.requestId}</span>
        </p>
      )}
      <p>Nothing counts as healthy until the status can be read.</p>
    </Frame>
  );
}
