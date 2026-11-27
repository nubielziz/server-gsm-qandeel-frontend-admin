// RevokeKeyDialog: "Revoke API key" with a review step. The key stops working at once and cannot be turned back on; the account makes a
// new one, or the Owner does. An expired key does not work already, but an Owner may give it a later end: revoking it keeps it dead, and
// the dialog says so. The demo's "Rotate key" has no admin route (MISMATCHES M45).
import { ConfirmDialog } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useRevokeApiKey } from '../../hooks/useAccountApiKeys';
import type { ApiKey } from '../../types';
import { apiKeyState } from './keyState';

/** Asks before revoking a key, and says what will stop working. */
export function RevokeKeyDialog({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const revoke = useRevokeApiKey();
  const expired = apiKeyState(apiKey, useNow()) === 'expired';
  return (
    <ConfirmDialog
      open
      title="Revoke API key"
      body={
        expired ? (
          <p>
            The key <span className="mono">{apiKey.prefix}…</span> ({apiKey.name}) has passed its end and does
            not work now. Revoking it means a later end can never bring it back.
          </p>
        ) : (
          <p>
            The key <span className="mono">{apiKey.prefix}…</span> ({apiKey.name}) stops working at once.
            Programs using it stop.
          </p>
        )
      }
      confirm="Revoke key"
      kind="danger"
      onClose={onClose}
      onConfirm={() => revoke.mutateAsync(apiKey).then(() => undefined)}
    />
  );
}
