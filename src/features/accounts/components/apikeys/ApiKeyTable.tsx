// ApiKeyTable: the keys of one account in the list skin: the name (with "Made by support" under a key staff made), the key's prefix, its
// limit, the addresses it may be used from, when it was made and last used, its state as a square and a word, and Limits… and Revoke… on the
// keys that still work. The demo's "Rotate key" has no admin route (MISMATCHES M45).
import type { ReactNode } from 'react';
import { Button, DataTable, StatusSquare, type DataTableColumn } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import type { ApiKey } from '../../types';
import type { GrantLock } from '../frame/useAccountGrants';
import { apiKeyState, KEY_LOOK } from './keyState';

export interface ApiKeyTableProps {
  /** The keys of the page being shown. */
  rows: readonly ApiKey[];
  /** From `useNow`, so the ages and the expiry test move together. */
  now: number;
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  /** Drawn when the account has no key. */
  empty: ReactNode;
  limitsLock: GrantLock;
  revokeLock: GrantLock;
  onLimits: (key: ApiKey) => void;
  onRevoke: (key: ApiKey) => void;
}

/** The table of keys. The footer pager under it is the part's. */
export function ApiKeyTable({
  rows,
  now,
  state,
  error,
  onRetry,
  empty,
  limitsLock,
  revokeLock,
  onLimits,
  onRevoke,
}: ApiKeyTableProps) {
  const columns: DataTableColumn<ApiKey>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (key) => (
        <>
          <span className="font-medium">{key.name}</span>
          {key.createdByStaff && <span className="cell-sub">Made by support</span>}
        </>
      ),
    },
    { key: 'prefix', label: 'Key', render: (key) => <span className="mono">{key.prefix}…</span> },
    {
      key: 'limit',
      label: 'Limit',
      hide: 'sm',
      render: (key) => `${key.rateLimitPerMin} a minute`,
    },
    {
      key: 'addresses',
      label: 'Allowed addresses',
      hide: 'md',
      render: (key) =>
        key.allowedIps.length > 0 ? (
          <span className="flex flex-col">
            {key.allowedIps.map((address) => (
              <span key={address} className="mono text-xs">
                {address}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-ink3">Any</span>
        ),
    },
    { key: 'created', label: 'Created', hide: 'lg', render: (key) => fmtDate(key.createdAt) },
    {
      key: 'used',
      label: 'Last used',
      hide: 'sm',
      render: (key) =>
        key.lastUsedAt ? (
          <>
            {ago(key.lastUsedAt, now)}
            {key.lastUsedIp ? <span className="cell-sub mono not-italic">{key.lastUsedIp}</span> : null}
          </>
        ) : (
          <span className="text-ink3">Never</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (key) => {
        const look = KEY_LOOK[apiKeyState(key, now)];
        return (
          <span className="inline-flex items-center gap-1.5">
            <StatusSquare tone={look.tone} label={look.word} />
            <span>{look.word}</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'w-44 text-end',
      render: (key) =>
        apiKeyState(key, now) === 'active' ? (
          <span className="inline-flex justify-end gap-1.5">
            <Button
              size="sm"
              aria-label={`Change limits of ${key.name}`}
              disabled={limitsLock.disabled}
              title={limitsLock.title}
              onClick={() => onLimits(key)}
            >
              Limits…
            </Button>
            <Button
              size="sm"
              variant="danger"
              aria-label={`Revoke ${key.name}`}
              disabled={revokeLock.disabled}
              title={revokeLock.title}
              onClick={() => onRevoke(key)}
            >
              Revoke…
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <DataTable
      skin="list"
      footer={false}
      caption="API keys"
      columns={columns}
      rows={rows}
      rowKey={(key) => key.id}
      state={state}
      error={error}
      errorTitle="Could not load the API keys"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
