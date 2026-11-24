// MerchantHeader: a merchant's title, status, the line under it and the actions (Adjust wallet…, Credit limit…, group menu,
// Activate account / Suspend… / Reactivate). Ports `head` and `actionsHtml` of pageMerchant in 42-p-merchants.js; an action the
// staff member lacks the permission for is disabled with that permission as its title.
import { Button, Icon, PageHeader } from '@/components/ui';
import { useActivateClient, useReactivateClient } from '../hooks/useClientMutations';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { joinedText } from '../lib/input';
import type { Client, ClientGroup } from '../types';
import { GroupMenu } from './GroupMenu';
import { MerchantStatusBadge } from './MerchantStatusBadge';

export interface MerchantHeaderProps {
  client: Client;
  groups: readonly ClientGroup[] | undefined;
  /** The groups are still loading (the group menu waits). */
  groupsLoading?: boolean;
  grants: MerchantGrants;
  now: number;
  onAdjust: () => void;
  onCreditLimit: () => void;
  onSuspend: () => void;
}

/**
 * The title, subtitle and action buttons of a merchant's page. Activate account (the one action of an account that is still
 * `pending`, made before accounts were active at once) and Reactivate act at once; the others open a dialog.
 */
export function MerchantHeader({
  client,
  groups,
  groupsLoading,
  grants,
  now,
  onAdjust,
  onCreditLimit,
  onSuspend,
}: MerchantHeaderProps) {
  const activate = useActivateClient();
  const reactivate = useReactivateClient();
  const updateLock = grants.needs('clients:update');
  const adjustLock = grants.needs('wallet:adjust');
  const limitLock = grants.needs('wallet:credit_limit');

  return (
    <PageHeader
      title={
        <>
          {client.name} <MerchantStatusBadge status={client.status} />
        </>
      }
      sub={
        <>
          <span className="mono">{client.country}</span> · {client.email} ·{' '}
          {joinedText(client.createdAt, now)}
        </>
      }
      actions={
        <>
          <Button disabled={adjustLock.disabled} title={adjustLock.title} onClick={onAdjust}>
            <Icon name="wallet" className="ic-sm" />
            Adjust wallet…
          </Button>
          <Button disabled={limitLock.disabled} title={limitLock.title} onClick={onCreditLimit}>
            <Icon name="sliders" className="ic-sm" />
            Credit limit…
          </Button>
          <GroupMenu client={client} groups={groups} groupsLoading={groupsLoading} grants={grants} />
          {client.status === 'pending' ? (
            <Button
              variant="primary"
              disabled={updateLock.disabled}
              title={updateLock.title}
              loading={activate.isPending}
              onClick={() => activate.mutate(client)}
            >
              Activate account
            </Button>
          ) : client.status === 'active' ? (
            <Button
              variant="danger"
              disabled={updateLock.disabled}
              title={updateLock.title}
              onClick={onSuspend}
            >
              <Icon name="ban" className="ic-sm" />
              Suspend…
            </Button>
          ) : (
            <Button
              disabled={updateLock.disabled}
              title={updateLock.title}
              loading={reactivate.isPending}
              onClick={() => reactivate.mutate(client)}
            >
              Reactivate
            </Button>
          )}
        </>
      }
    />
  );
}
