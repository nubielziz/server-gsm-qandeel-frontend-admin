// ProfileTab: the "Profile" tab of a merchant's page (feature 20): three cards, Account (who they are and how to reach them),
// Business (address and tax ID) and Notes (the staff-only notes), with "Edit details". A value the server
// did not send shows a dash.
import type { ReactNode } from 'react';
import { Badge, Button, Icon, KeyValue, type KeyValueRow } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { Client } from '../types';

const DASH = <span className="text-ink3">–</span>;
const orDash = (text: string | undefined): ReactNode => (text ? text : DASH);

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line p-3.5" aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

// The merchant's email with a Verified / Not verified chip.
function EmailCell({ client }: { client: Client }) {
  return (
    <>
      {client.email}{' '}
      {client.emailVerifiedAt ? (
        <Badge tone="good" icon="checkCircle">
          Verified
        </Badge>
      ) : (
        <Badge tone="neutral" icon="clock">
          Not verified
        </Badge>
      )}
    </>
  );
}

/** Shows the merchant's details in three cards, and the Edit details button (needs `clients:update`). */
export function ProfileTab({
  client,
  grants,
  onEdit,
}: {
  client: Client;
  grants: MerchantGrants;
  onEdit: () => void;
}) {
  const updateLock = grants.needs('clients:update');
  const account: KeyValueRow[] = [
    ['Name', client.name],
    ['Company', orDash(client.company)],
    ['Email', <EmailCell key="e" client={client} />],
    ['Phone', orDash(client.phone)],
    [
      'Country',
      <span key="c" className="mono">
        {client.country}
      </span>,
    ],
    [
      'Username',
      <span key="u" className="mono">
        {client.username}
      </span>,
    ],
    ['Group', client.group ? client.group.name : DASH],
    ['Joined', fmtDate(client.createdAt)],
  ];

  return (
    <div className="p-3.5">
      <div className="mb-3 flex justify-end">
        <Button disabled={updateLock.disabled} title={updateLock.title} onClick={onEdit}>
          <Icon name="edit" className="ic-sm" />
          Edit details
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Account">
          <KeyValue rows={account} />
        </Card>
        <div className="space-y-4">
          <Card title="Business">
            <KeyValue
              rows={[
                [
                  'Address',
                  client.address ? <span className="whitespace-pre-line">{client.address}</span> : DASH,
                ],
                ['Tax ID', client.taxId ? <span className="mono">{client.taxId}</span> : DASH],
              ]}
            />
          </Card>
          <Card title="Notes">
            <KeyValue
              rows={[
                [
                  'Internal notes',
                  client.internalNotes ? (
                    <span className="whitespace-pre-line">{client.internalNotes}</span>
                  ) : (
                    <span className="text-ink3">None. Only your team sees notes.</span>
                  ),
                ],
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
