// ApiAccessTab: the "API access" tab of a merchant's page: the Dhru endpoint and username, and the merchant's keys with New key…,
// Limits… and Revoke. Ports merApiTab of 42-p-merchants.js. The demo's "Rotate key" has no admin route (MISMATCHES M45); staff
// can make a key for an active merchant (feature 20), shown once. The endpoint is the map's Dhru address (`/api/index.php`), not the demo's `/dhru/index.php` (MISMATCHES M51).
import { useState } from 'react';
import { Button, CopyButton, EmptyState, Icon, KeyValue, QueryState, SkeletonTable } from '@/components/ui';
import { apiUrl } from '@/lib/api';
import { useNow } from '@/lib/format';
import { useClientApiKeys } from '../hooks/useClientApiKeys';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { ApiKey, Client } from '../types';
import { ApiKeyTable } from './ApiKeyTable';
import { CreateKeyDialog } from './CreateKeyDialog';
import { KeyLimitsDialog } from './KeyLimitsDialog';
import { RevealKeyDialog } from './RevealKeyDialog';
import { RevokeKeyDialog } from './RevokeKeyDialog';

/** Why "New key…" is off for a merchant who is not active, or undefined when it may be used. */
function createBlocked(status: Client['status']): string | undefined {
  if (status === 'active') return undefined;
  return status === 'pending'
    ? 'Activate the account first: only an active merchant can have keys.'
    : 'Reactivate the account first: only an active merchant can have keys.';
}

// Which dialog is open: revoke or limits for a key, a new key, or the one-time view of the key just made.
type Dialog =
  | { kind: 'revoke' | 'limits'; key: ApiKey }
  | { kind: 'create' }
  | { kind: 'reveal'; name: string; secret: string };

/** Shows the Dhru endpoint and username, and the merchant's keys with Revoke. */
export function ApiAccessTab({ client, grants }: { client: Client; grants: MerchantGrants }) {
  const keys = useClientApiKeys(client.id, grants.can('api_keys:read'));
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('api_keys:create');
  const blocked = createBlocked(client.status);
  const endpoint = apiUrl('/api/index.php');
  const rows = keys.data ?? [];

  return (
    <div className="p-3.5">
      <KeyValue
        rows={[
          [
            'Dhru endpoint',
            <span key="e" className="flex items-center gap-1">
              <span className="mono break-all">{endpoint}</span>
              <CopyButton value={endpoint} label="endpoint" />
            </span>,
          ],
          [
            'Username',
            <span key="u" className="mono">
              {client.username}
            </span>,
          ],
        ]}
      />
      <div className="mb-2 mt-5 flex items-center gap-2">
        <h3 className="text-sm font-semibold">API keys</h3>
        <span className="flex-1" />
        <Button
          size="sm"
          disabled={createLock.disabled || blocked !== undefined}
          title={createLock.title ?? blocked}
          onClick={() => setDialog({ kind: 'create' })}
        >
          <Icon name="plus" className="ic-sm" />
          New key…
        </Button>
      </div>
      <QueryState
        isLoading={keys.isLoading}
        isError={keys.isError}
        error={keys.error}
        onRetry={() => void keys.refetch()}
        errorTitle="Could not load the API keys"
        skeleton={<SkeletonTable cols={4} rows={2} />}
        isEmpty={rows.length === 0}
        empty={
          <EmptyState icon="key" title="No API keys yet">
            {client.status === 'pending'
              ? 'The merchant can create a key in their portal once the account is active.'
              : 'The merchant creates their keys in their portal. They show here as soon as there is one.'}
          </EmptyState>
        }
      >
        <div className="rounded-lg border border-line">
          <ApiKeyTable
            rows={rows}
            now={now}
            grants={grants}
            onRevoke={(key) => setDialog({ kind: 'revoke', key })}
            onLimits={(key) => setDialog({ kind: 'limits', key })}
          />
        </div>
      </QueryState>
      <p className="mt-4 rounded-md bg-sunken p-3 text-xs text-ink2">
        Merchants can keep their existing Dhru Fusion client. Only the URL and key change.
      </p>
      {dialog?.kind === 'revoke' && (
        <RevokeKeyDialog client={client} apiKey={dialog.key} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'limits' && <KeyLimitsDialog apiKey={dialog.key} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'create' && (
        <CreateKeyDialog
          client={client}
          onClose={() => setDialog(null)}
          onReveal={(name, secret) => setDialog({ kind: 'reveal', name, secret })}
        />
      )}
      {dialog?.kind === 'reveal' && (
        <RevealKeyDialog name={dialog.name} secret={dialog.secret} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
