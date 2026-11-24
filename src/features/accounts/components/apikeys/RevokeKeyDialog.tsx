// RevokeKeyDialog: "Revoke API key" with a review step. The key stops working at once and cannot be turned back on; the account makes a
// new one, or the Owner does. The demo's "Rotate key" has no admin route (MISMATCHES M45).
import { ConfirmDialog } from '@/components/ui';
import { useRevokeApiKey } from '../../hooks/useAccountApiKeys';
import type { ApiKey } from '../../types';

/** Asks before revoking a key, and says what will stop working. */
export function RevokeKeyDialog({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const revoke = useRevokeApiKey();
  return (
    <ConfirmDialog
      open
      title="Revoke API key"
      body={
        <p>
          The key <span className="mono">{apiKey.prefix}…</span> ({apiKey.name}) stops working at once.
          Programs using it stop.
        </p>
      }
      confirm="Revoke key"
      kind="danger"
      onClose={onClose}
      onConfirm={() => revoke.mutateAsync(apiKey).then(() => undefined)}
    />
  );
}
