// RevokeKeyDialog: "Revoke API key" with a review step (the demo's "Rotate API key" confirm, `m-rotate`, which the map replaces
// with revoke: merchants make their own new keys, MISMATCHES M45). The key stops working at once.
import { ConfirmDialog } from '@/components/ui';
import { useRevokeApiKey } from '../hooks/useClientApiKeys';
import type { ApiKey, Client } from '../types';

/** Asks before revoking a key, and says what will stop working. */
export function RevokeKeyDialog({
  client,
  apiKey,
  onClose,
}: {
  client: Pick<Client, 'name'>;
  apiKey: ApiKey;
  onClose: () => void;
}) {
  const revoke = useRevokeApiKey();
  return (
    <ConfirmDialog
      open
      title="Revoke API key"
      body={
        <p>
          The key <span className="mono">{apiKey.prefix}…</span> ({apiKey.name}) stops working immediately.{' '}
          {client.name} must create a new key in their portal before their next call, or orders will fail.
        </p>
      }
      confirm="Revoke key"
      kind="danger"
      onClose={onClose}
      onConfirm={() => revoke.mutateAsync(apiKey).then(() => undefined)}
    />
  );
}
