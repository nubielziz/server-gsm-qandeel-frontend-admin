// ApiPart: the "API" part of an account's record (for an account with a merchant rank and a login): the Dhru address and username a merchant's
// client program uses, and the account's API keys with New key…, Limits… and Revoke…. The Owner makes a key for an active account (shown once);
// anyone with the permission changes limits or revokes. The demo's "Rotate key" has no admin route (MISMATCHES M45). The address is the map's
// Dhru address (`/api/index.php`), not the demo's `/dhru/index.php` (MISMATCHES M51). The keys are read whole and paged in the browser.
import { useState } from 'react';
import {
  Button,
  CopyButton,
  EmptyState,
  FooterPager,
  FormRow,
  Icon,
  ReadValue,
  SectionHeading,
} from '@/components/ui';
import { apiUrl } from '@/lib/api';
import { useNow } from '@/lib/format';
import { useAccountApiKeys } from '../../hooks/useAccountApiKeys';
import type { ApiKey } from '../../types';
import type { AccountPartProps } from '../types';
import { ApiKeyTable } from './ApiKeyTable';
import { newKeyLock } from './keyState';
import { KeyLimitsDialog } from './KeyLimitsDialog';
import { NewKeyDialog } from './NewKeyDialog';
import { RevealKeyDialog } from './RevealKeyDialog';
import { RevokeKeyDialog } from './RevokeKeyDialog';

// Which dialog is open: a key's limits or its revoking, a new key, or the one-time view of the key just made (held here, never cached).
type Dialog =
  | { kind: 'limits' | 'revoke'; key: ApiKey }
  | { kind: 'create' }
  | { kind: 'reveal'; name: string; secret: string };

const DEFAULT_SIZE = 50;

/** The Dhru address, the username and the keys of one account. Its dialogs are mounted only while open. */
export function ApiPart({ account, grants }: AccountPartProps) {
  const keys = useAccountApiKeys(account.id, grants.can('api_keys:read'));
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_SIZE);

  const all = keys.data ?? [];
  const current = Math.min(page, Math.max(1, Math.ceil(all.length / size)));
  const shown = all.slice((current - 1) * size, current * size);
  const createLock = newKeyLock(grants, account.status);
  const address = apiUrl('/api/index.php');

  return (
    <div className="view-frame">
      <div>
        <FormRow label="Dhru address">
          <ReadValue>
            <span className="mono break-all">{address}</span>
            <CopyButton value={address} label="the address" />
          </ReadValue>
          <span className="cell-sub">
            Merchants keep their own client program; only the address and the key change.
          </span>
        </FormRow>
        <FormRow label="Username">
          {account.username ? (
            <ReadValue>
              <span className="mono">{account.username}</span>
              <CopyButton value={account.username} label="the username" />
            </ReadValue>
          ) : (
            <ReadValue muted>–</ReadValue>
          )}
        </FormRow>

        <SectionHeading>API keys</SectionHeading>
        <ApiKeyTable
          rows={shown}
          now={now}
          state={keys.isLoading ? 'loading' : keys.isError ? 'error' : 'ready'}
          error={keys.error}
          onRetry={() => void keys.refetch()}
          empty={
            <EmptyState icon="key" title="No API keys yet">
              The merchant creates keys in their portal; they show here.
            </EmptyState>
          }
          limitsLock={grants.needs('api_keys:update')}
          revokeLock={grants.needs('api_keys:revoke')}
          onLimits={(key) => setDialog({ kind: 'limits', key })}
          onRevoke={(key) => setDialog({ kind: 'revoke', key })}
        />
        <div className="mt-3">
          <Button
            size="sm"
            disabled={createLock.disabled}
            title={createLock.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" className="ic-sm" />
            New key…
          </Button>
        </div>

        {dialog?.kind === 'limits' && <KeyLimitsDialog apiKey={dialog.key} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'revoke' && <RevokeKeyDialog apiKey={dialog.key} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'create' && (
          <NewKeyDialog
            account={account}
            onClose={() => setDialog(null)}
            onReveal={(name, secret) => setDialog({ kind: 'reveal', name, secret })}
          />
        )}
        {dialog?.kind === 'reveal' && (
          <RevealKeyDialog name={dialog.name} secret={dialog.secret} onClose={() => setDialog(null)} />
        )}
      </div>
      <FooterPager
        page={current}
        pageSize={size}
        total={all.length}
        onPage={setPage}
        onPageSize={(next) => {
          setSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
