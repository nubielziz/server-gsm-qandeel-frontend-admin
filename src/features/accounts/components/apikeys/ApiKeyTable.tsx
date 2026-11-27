// ApiKeyTable: the keys of one account in the list skin: the name (with "Made by support" under a key staff made), the key's prefix, its
// limit, its permissions at a glance (the addresses that may use it, or "Any address", and "Valid until <day>" or "No end", marked when the key has
// expired; decision 039; on a small screen, where the column is hidden, the same words as one line under the name), when it was made and last used,
// its state as a square and a word, and Edit… and Revoke… (both on a key that is not revoked: an expired key may be given a later end, so it may be
// revoked to stay dead). The demo's "Rotate key" has no admin route (MISMATCHES M45).
import type { ReactNode } from 'react';
import { Button, cx, DataTable, StatusSquare, type DataTableColumn } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import type { ApiKey } from '../../types';
import type { GrantLock } from '../frame/useAccountGrants';
import { apiKeyState, KEY_LOOK, keyPermissions, permissionsLine } from './keyState';

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
  editLock: GrantLock;
  revokeLock: GrantLock;
  onEdit: (key: ApiKey) => void;
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
  editLock,
  revokeLock,
  onEdit,
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
          {/* The Permissions column is hidden on small screens: its words go under the name there. */}
          <span className="cell-sub sm:hidden">{permissionsLine(keyPermissions(key, now))}</span>
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
      key: 'permissions',
      label: 'Permissions',
      hide: 'sm',
      render: (key) => {
        const { addresses, validUntil, expired } = keyPermissions(key, now);
        return (
          <span className="flex flex-col">
            {addresses.length > 0 ? (
              addresses.map((address) => (
                <span key={address} className="mono text-xs">
                  {address}
                </span>
              ))
            ) : (
              <span className="text-ink2">Any address</span>
            )}
            <span className={cx('cell-sub', expired && 'text-warn-fg')}>
              {validUntil}
              {expired ? ' · Expired' : ''}
            </span>
          </span>
        );
      },
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
      render: (key) => {
        const state = apiKeyState(key, now);
        return state === 'revoked' ? null : (
          <span className="inline-flex justify-end gap-1.5">
            <Button
              size="sm"
              aria-label={`Edit ${key.name}`}
              disabled={editLock.disabled}
              title={editLock.title}
              onClick={() => onEdit(key)}
            >
              Edit…
            </Button>
            {/* An expired key can be given a later end, so it can be revoked too: only a revoke keeps it dead. */}
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
        );
      },
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
