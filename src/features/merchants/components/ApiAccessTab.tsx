// ApiAccessTab: the "API access" tab of a merchant's page: the Dhru endpoint and username, and the merchant's keys with Revoke.
// Ports merApiTab of 42-p-merchants.js. The demo's "Rotate key" has no admin route (merchants make their own keys), so staff can
// revoke (MISMATCHES M45). The endpoint is the map's Dhru address (`/api/index.php`), not the demo's `/dhru/index.php` (MISMATCHES M51).
import { useState } from 'react';
import { CopyButton, EmptyState, KeyValue, QueryState, SkeletonTable } from '@/components/ui';
import { apiUrl } from '@/lib/api';
import { useNow } from '@/lib/format';
import { useClientApiKeys } from '../hooks/useClientApiKeys';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { ApiKey, Client } from '../types';
import { ApiKeyTable } from './ApiKeyTable';
import { RevokeKeyDialog } from './RevokeKeyDialog';

/** Shows the Dhru endpoint and username, and the merchant's keys with Revoke. */
export function ApiAccessTab({ client, grants }: { client: Client; grants: MerchantGrants }) {
  const keys = useClientApiKeys(client.id, grants.can('api_keys:read'));
  const now = useNow();
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
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
      <h3 className="mb-2 mt-5 text-sm font-semibold">API keys</h3>
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
              ? 'The merchant can create a key in their portal once you approve the account.'
              : 'The merchant creates their keys in their portal. They show here as soon as there is one.'}
          </EmptyState>
        }
      >
        <div className="rounded-lg border border-line">
          <ApiKeyTable rows={rows} now={now} grants={grants} onRevoke={setRevoking} />
        </div>
      </QueryState>
      <p className="mt-4 rounded-md bg-sunken p-3 text-xs text-ink2">
        Merchants can keep their existing Dhru Fusion client. Only the URL and key change.
      </p>
      {revoking && <RevokeKeyDialog client={client} apiKey={revoking} onClose={() => setRevoking(null)} />}
    </div>
  );
}
