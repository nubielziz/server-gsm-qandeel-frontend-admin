// RestrictionPanel: the switch "Only allowed IPs can open the admin console" with a line saying whether your own address
// gets in. Ports the `gate` block of tabIpAllow and the `ac-restrict` action in 56-p-access.js. Turning it on while your
// address is not on the list opens "Add your address first"; turning it off asks first.
import { useState } from 'react';
import { Button, errorText, Icon, Switch, toast } from '@/components/ui';
import { errorToast } from '@/lib/query';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useIpVerdict } from '../hooks/useIpCheck';
import { useRestriction, useSetRestriction } from '../hooks/useRestriction';
import { turnOnGuard } from '../lib/ipGuards';
import { readVerdict } from '../lib/ipVerdict';
import type { IpRule } from '../types';
import { AddMyIpDialog } from './AddMyIpDialog';
import { TurnOffRestrictionDialog } from './TurnOffRestrictionDialog';

// "Your address 203.0.113.24 is allowed by “Office”." in green, or the reason it is not in red; plain when the restriction is off.
function MyAddressLine({ ip, restricted }: { ip: string; restricted: boolean }) {
  const { can } = useAccessGrants();
  const { data } = useIpVerdict(ip, 'admin', restricted && can('access:read'));
  if (!restricted) {
    return (
      <span className="text-ink3">
        Your address is <span className="mono">{ip}</span>.
      </span>
    );
  }
  if (!data) return null;
  const verdict = readVerdict(data);
  if (verdict.ok) {
    return (
      <span className="text-good-fg">
        <Icon name="checkCircle" className="ic-xs inline" /> Your address <span className="mono">{ip}</span>{' '}
        is allowed{verdict.rule ? ` by “${verdict.rule.label || verdict.rule.cidr}”` : ''}.
      </span>
    );
  }
  return (
    <span className="text-crit-fg">
      <Icon name="alert" className="ic-xs inline" /> Your address <span className="mono">{ip}</span> is{' '}
      {verdict.why === 'blocked' ? 'blocked' : 'not on the list'}.
    </span>
  );
}

// What the panel says about the setting. The sentences for on and off are the demo's.
function gateText(canRead: boolean, restricted: boolean | undefined): string {
  if (!canRead) return 'You need the settings:read permission to see whether this is on.';
  if (restricted === undefined) return 'The current setting is not known yet.';
  return restricted
    ? 'Anyone else gets a plain “Access denied” page and never sees the sign-in form. A password and 2FA are still needed on top. Block rules always win over this list.'
    : 'Right now the sign-in page opens from any address. Turn this on to let only the addresses below reach it.';
}

export interface RestrictionPanelProps {
  /** The live allowed rules, once loaded: turning the restriction on is judged against them. */
  allowRules: readonly IpRule[];
  /** False while the rules are loading, so the switch cannot be used on a guess. */
  rulesReady: boolean;
}

/**
 * The restriction switch with its two guarded flows: turning it off asks first, turning it on without the
 * caller's address on the list offers to add it.
 */
export function RestrictionPanel({ allowRules, rulesReady }: RestrictionPanelProps) {
  const grants = useAccessGrants();
  // The state lives in the settings, which need their own read permission.
  const canReadSetting = grants.can('settings:read');
  const { restricted, query } = useRestriction({ enabled: canReadSetting });
  const setRestriction = useSetRestriction();
  const [dialog, setDialog] = useState<'off' | 'mine' | null>(null);
  const lock = grants.needs('access:update');
  const on = restricted === true;
  const mine = turnOnGuard({ allowRules, myIp: grants.myIp });

  function toggle(next: boolean) {
    if (!next) return setDialog('off');
    if (!mine.ok) return setDialog('mine');
    setRestriction.mutate(true, {
      onError: (error) => {
        const { message, description } = errorToast(error);
        toast({ kind: 'error', title: message, body: description, ttl: 7000 });
      },
    });
  }

  return (
    <section className="panel mb-4 p-3.5" aria-label="Admin console restriction">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <h2 className="text-sm font-semibold">Only allowed IPs can open the admin console</h2>
          <p className="mt-1 text-sm text-ink2">{gateText(canReadSetting, restricted)}</p>
          {restricted !== undefined && grants.myIp && (
            <p className="mt-2 text-xs">
              <MyAddressLine ip={grants.myIp} restricted={on} />
            </p>
          )}
          {query.isError && (
            <p className="mt-2 text-xs text-crit-fg" role="alert">
              Could not read the setting: {errorText(query.error)}{' '}
              <Button size="sm" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium">{restricted === undefined ? '…' : on ? 'On' : 'Off'}</span>
          <Switch
            checked={on}
            label={`${on ? 'Turn off' : 'Turn on'}: only allowed IPs can open the admin console`}
            disabled={lock.disabled || restricted === undefined || !rulesReady || setRestriction.isPending}
            title={lock.title}
            onChange={toggle}
          />
        </div>
      </div>
      {dialog === 'off' && <TurnOffRestrictionDialog onClose={() => setDialog(null)} />}
      {dialog === 'mine' && grants.myIp && !mine.ok && (
        <AddMyIpDialog
          myIp={grants.myIp}
          name={grants.me?.name ?? 'me'}
          reason={mine.reason}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
