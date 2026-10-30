// AccountDetails: the "Sign-in and contact" facts of the Account tab. An account shows sign-in, email with its verification,
// phone, password, last sign-in, devices and the last address; a guest shows sign-in, email, phone and the address, with a note
// on what a guest is. Ports the `left` column of accountTab in 48-p-customers.js.
import { Badge, KeyValue, TypeTag } from '@/components/ui';
import { ago } from '@/lib/format';
import { createdByText, devicesText, lastSeenIp, passwordText } from '../lib/text';
import type { CustomerDetail } from '../types';
import { LastSeenFrom } from './LastSeenFrom';

export interface AccountDetailsProps {
  customer: CustomerDetail;
  now: number;
  /** Props of the Block IP button (see `LastSeenFrom`). */
  blockLock: { disabled: boolean; title?: string };
  onBlockIp: () => void;
}

export function AccountDetails({ customer, now, blockLock, onBlockIp }: AccountDetailsProps) {
  const { account } = customer;
  const created = createdByText(customer);
  const phone = customer.phone || <span className="text-ink3">None</span>;
  const seen = [
    'Last seen from',
    <LastSeenFrom ip={lastSeenIp(customer)} lock={blockLock} onBlock={onBlockIp} />,
  ] as const;

  if (!account) {
    return (
      <>
        <KeyValue
          rows={[
            [
              'Sign-in',
              <>
                <TypeTag>Guest</TypeTag> {created}
              </>,
            ],
            ['Email', customer.email],
            ['Phone', phone],
            seen,
          ]}
        />
        <p className="mt-3 rounded-md bg-sunken p-2.5 text-sm text-ink2">
          A guest has no password and no sign-in. They follow their orders from the link in their email.
          Create an account if they want to sign in and see all their orders in one place.
        </p>
      </>
    );
  }

  const password = passwordText(account, now);
  return (
    <KeyValue
      rows={[
        [
          'Sign-in',
          <>
            <TypeTag>Account</TypeTag> {created}
          </>,
        ],
        [
          'Email',
          <>
            {customer.email}{' '}
            {account.emailVerified ? (
              <Badge tone="good" icon="checkCircle">
                Verified
              </Badge>
            ) : (
              <Badge tone="neutral" icon="clock">
                Not verified
              </Badge>
            )}
          </>,
        ],
        ['Phone', phone],
        [
          'Password',
          <>
            {password.warn ? (
              <span className="font-medium text-warn-fg">{password.text}</span>
            ) : (
              password.text
            )}
            {password.note && <span className="block text-xs font-medium text-warn-fg">{password.note}</span>}
          </>,
        ],
        [
          'Last sign-in',
          customer.lastLoginAt ? ago(customer.lastLoginAt, now) : <span className="text-ink3">Never</span>,
        ],
        [
          'Signed in on',
          account.activeSessions ? (
            devicesText(account.activeSessions)
          ) : (
            <span className="text-ink3">No active sessions</span>
          ),
        ],
        seen,
      ]}
    />
  );
}
