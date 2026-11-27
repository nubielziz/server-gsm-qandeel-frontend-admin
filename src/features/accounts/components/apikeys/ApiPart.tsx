// ApiPart: the "API" part of an account's record (for an account with a merchant rank and a login): the Dhru address and username a merchant's
// client program uses, and the account's API keys with "Generate API key" (one click, no dialog, the server names the key), "Key with limits…",
// Edit… and Revoke…. The Owner makes a key for an active account (shown once); anyone with the permission edits or revokes (a change that gives
// a key more reach is for the Owner, the server says so). The demo's "Rotate key" has no admin route (MISMATCHES M45). The address is the map's
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
import { useAccountApiKeys, useCreateAccountApiKey } from '../../hooks/useAccountApiKeys';
import type { ApiKey } from '../../types';
import type { AccountPartProps } from '../types';
import { ApiKeyTable } from './ApiKeyTable';
import { newKeyLock } from './keyState';
import { EditKeyDialog } from './EditKeyDialog';
import { NewKeyDialog } from './NewKeyDialog';
import { RevealKeyDialog } from './RevealKeyDialog';
import { RevokeKeyDialog } from './RevokeKeyDialog';

// Which dialog is open: a key's edit or its revoking, a new key, or the one-time view of the key just made (held here, never cached).
type Dialog =
  | { kind: 'edit' | 'revoke'; key: ApiKey }
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
  const generate = useCreateAccountApiKey({ toastErrors: true });

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
          editLock={grants.needs('api_keys:update')}
          revokeLock={grants.needs('api_keys:revoke')}
          onEdit={(key) => setDialog({ kind: 'edit', key })}
          onRevoke={(key) => setDialog({ kind: 'revoke', key })}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* One click: no dialog and no name (the server names the key); the key is then shown once, in the one-time dialog. */}
          <Button
            size="sm"
            variant="primary"
            loading={generate.isPending}
            disabled={createLock.disabled}
            title={createLock.title}
            onClick={() =>
              generate.mutate(
                { account, body: {} },
                {
                  onSuccess: (created) => {
                    setDialog({ kind: 'reveal', name: created.key.name, secret: created.secret });
                    // The one-time dialog holds the key now: let go of the mutation's copy, or it stays in memory while the part is open.
                    generate.reset();
                  },
                },
              )
            }
          >
            <Icon name="plus" className="ic-sm" />
            Generate API key
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={createLock.disabled || generate.isPending}
            title={createLock.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            Key with limits…
          </Button>
        </div>

        {dialog?.kind === 'edit' && <EditKeyDialog apiKey={dialog.key} onClose={() => setDialog(null)} />}
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
