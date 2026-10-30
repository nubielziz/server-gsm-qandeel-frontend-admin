// ApiKeyTable: a merchant's API keys (name, key prefix, allowed addresses, created, last used, status, Revoke). Ports the API key
// row of merApiTab in 42-p-merchants.js, which showed one key and a "Rotate key" button; the map has only list and revoke (MISMATCHES M45).
import { Badge, Button, DataTable, type DataTableColumn } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { apiKeyState, KEY_BADGE } from '../lib/keys';
import type { ApiKey } from '../types';

export interface ApiKeyTableProps {
  rows: readonly ApiKey[];
  now: number;
  grants: MerchantGrants;
  onRevoke: (key: ApiKey) => void;
}

/** Draws the keys, with a Revoke button on the ones that still work. */
export function ApiKeyTable({ rows, now, grants, onRevoke }: ApiKeyTableProps) {
  const revokeLock = grants.needs('api_keys:revoke');
  const columns: DataTableColumn<ApiKey>[] = [
    {
      key: 'name',
      label: 'Key',
      render: (key) => (
        <>
          <span className="font-medium">{key.name}</span>
          <p className="mono text-2xs text-ink3">{key.prefix}…</p>
        </>
      ),
    },
    {
      key: 'ips',
      label: 'Allowed IPs',
      hide: 'md',
      render: (key) =>
        key.allowedIps.length > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {key.allowedIps.map((ip) => (
              <span key={ip} className="chip">
                {ip}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-ink3">Any IP</span>
        ),
    },
    { key: 'created', label: 'Created', hide: 'sm', render: (key) => fmtDate(key.createdAt) },
    {
      key: 'used',
      label: 'Last used',
      render: (key) =>
        key.lastUsedAt ? (
          <>
            {ago(key.lastUsedAt, now)}
            {key.lastUsedIp && <p className="mono text-2xs text-ink3">{key.lastUsedIp}</p>}
          </>
        ) : (
          <span className="text-ink3">Never</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (key) => {
        const look = KEY_BADGE[apiKeyState(key, now)];
        return (
          <Badge tone={look.tone} icon={look.icon}>
            {look.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (key) =>
        apiKeyState(key, now) === 'active' ? (
          <Button
            size="sm"
            variant="danger"
            aria-label={`Revoke ${key.name}`}
            disabled={revokeLock.disabled}
            title={revokeLock.title}
            onClick={() => onRevoke(key)}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  return <DataTable caption="API keys" columns={columns} rows={rows} rowKey={(key) => key.id} />;
}
