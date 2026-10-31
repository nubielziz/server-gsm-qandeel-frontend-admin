// MaintenanceBanner: the warning strip under the top bar of every page while maintenance is on (manifest `banner`). It
// reads the same health summary as the System health page, only for staff with `system:read`, and links to the page.
// It is loaded with the app shell, so it imports only what it needs and nothing from the page's chunk.
import { Fragment } from 'react';
import { useLocation } from 'react-router';
import { ButtonLink, Icon } from '@/components/ui';
import { useHealthGrants } from '../hooks/useHealthGrants';
import { useSystemHealth } from '../hooks/useHealth';
import { HEALTH_PATH } from '../lib/healthTabs';
import { whenText } from '../lib';
import { scopePhrase } from './maintenance';

/**
 * Renders nothing unless maintenance is on. It is a polite `status` region, so a screen reader hears it when maintenance
 * is turned on while someone works on another page. On the System health page itself the "Manage" link is left out: the
 * header's Maintenance button is right there.
 */
export function MaintenanceBanner() {
  const grants = useHealthGrants();
  const health = useSystemHealth(grants.can('system:read'));
  const { pathname } = useLocation();
  const state = health.data?.maintenance;
  if (!state?.enabled) return null;

  const since = whenText(state.startedAt);
  const end = whenText(state.expectedEndAt);
  const facts = [
    since && `Since ${since}${state.startedBy ? ` by ${state.startedBy.name}` : ''}`,
    end && `Expected end ${end}`,
  ].filter(Boolean);
  // Title, the customers' message and the facts, side by side. Nothing is added after the message, so a message that ends
  // with its own full stop never meets another one.
  const parts = [
    <span key="title" className="font-medium">
      Maintenance is on for {scopePhrase(state.scope)}.
    </span>,
    state.message && <span key="message">Customers see “{state.message}”</span>,
    facts.length > 0 && <span key="facts">{facts.join(' · ')}</span>,
  ].filter(Boolean);

  return (
    <div role="status" className="border-b border-line bg-warn-bg text-warn-fg">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm lg:px-6">
        <Icon name="alert" className="ic-sm flex-none" />
        <p className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-0.5">
          {parts.map((part, index) => (
            <Fragment key={index}>
              {/* A flex container draws no space between its items, but the text of the strip should have one. */}
              {index > 0 && ' '}
              {part}
            </Fragment>
          ))}
        </p>
        {pathname !== HEALTH_PATH && (
          <ButtonLink to={HEALTH_PATH} size="sm">
            Manage
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
