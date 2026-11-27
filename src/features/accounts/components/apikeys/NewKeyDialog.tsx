// NewKeyDialog: "New API key for <account>": a name and the addresses the key may be used from (one per line); the optional expiry day and
// the per-minute limit (60 unless changed) sit in a "More options" fold (decision 035). The key acts as the account, so only the Owner makes one (the part's button says so). The key
// comes back once; this dialog hands it to the one-time dialog after it has closed. A 409 `NOT_ACTIVE` and a 422 show in the dialog;
// `allowedIps.N` errors show under the box with the number of the line.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, MoreOptions, TextareaField, TextField } from '@/components/ui';
import { useCreateAccountApiKey } from '../../hooks/useAccountApiKeys';
import type { AccountRow, CreateApiKeyBody } from '../../types';
import { accountLabel } from '../shared/accountLabel';
import {
  cleanKeyName,
  dayIsPast,
  expiryOf,
  foldKeyErrors,
  KEY_NAME_MAX,
  MAX_ALLOWED_IPS,
  parseIpLines,
  parseRateLimit,
  RATE_LIMIT,
} from './keyInput';

type Values = {
  name: string;
  allowedIps: string;
  expiresOn: string;
  rateLimitPerMin: string;
};
const FIELDS = ['name', 'allowedIps', 'expiresOn', 'rateLimitPerMin'] as const;

export interface NewKeyDialogProps {
  account: Pick<AccountRow, 'id' | 'name' | 'email' | 'status'>;
  onClose: () => void;
  /** Called after the dialog has closed with the new key, so it can be shown once. */
  onReveal: (name: string, secret: string) => void;
}

/** The form for a key staff make for an account with a merchant rank. Mounted only while open, so it starts empty. */
export function NewKeyDialog({ account, onClose, onReveal }: NewKeyDialogProps) {
  const create = useCreateAccountApiKey();
  const revealed = useRef<{ name: string; secret: string } | undefined>(undefined);
  const form = useForm<Values>({
    defaultValues: {
      name: '',
      allowedIps: '',
      expiresOn: '',
      rateLimitPerMin: String(RATE_LIMIT.default),
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const addresses = parseIpLines(values.allowedIps);
      const body: CreateApiKeyBody = {
        name: cleanKeyName(values.name),
        ...(addresses.length > 0 ? { allowedIps: addresses } : {}),
        ...(values.expiresOn ? { expiresAt: expiryOf(values.expiresOn) } : {}),
        rateLimitPerMin: parseRateLimit(values.rateLimitPerMin) ?? RATE_LIMIT.default,
      };
      try {
        const created = await create.mutateAsync({ account, body });
        revealed.current = { name: created.key.name, secret: created.secret };
      } catch (error) {
        throw foldKeyErrors(error);
      }
    },
    { fields: FIELDS, aliases: { expiresAt: 'expiresOn' } },
  );

  return (
    <FormDialog
      open
      title={`New API key for ${accountLabel(account)}`}
      sub="The key acts as the account. It is shown once, and they are emailed a notice."
      confirm="Create key"
      onClose={() => {
        const key = revealed.current;
        if (key) onReveal(key.name, key.secret);
        else onClose();
      }}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Name"
          placeholder="Production server"
          autoComplete="off"
          error={errors.name}
          {...register('name', {
            validate: (value) => {
              const name = cleanKeyName(value);
              return name === ''
                ? 'Name the key.'
                : name.length > KEY_NAME_MAX
                  ? `Use at most ${KEY_NAME_MAX} characters.`
                  : true;
            },
          })}
        />
        <TextareaField
          label="Allowed addresses"
          rows={3}
          placeholder={'203.0.113.55\n198.51.100.0/24'}
          spellCheck={false}
          hint={`One address or range per line, at most ${MAX_ALLOWED_IPS}. Leave empty to allow any address.`}
          error={errors.allowedIps}
          {...register('allowedIps', {
            validate: (value) =>
              parseIpLines(value).length <= MAX_ALLOWED_IPS || `Use at most ${MAX_ALLOWED_IPS} addresses.`,
          })}
        />
        {/* The expiry (none) and the limit (60) keep their defaults and are sent as before; a message under either opens the fold. */}
        <MoreOptions forceOpen={Boolean(errors.expiresOn || errors.rateLimitPerMin)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Expires on"
              type="date"
              hint="Optional. The key stops working at the end of that day."
              error={errors.expiresOn}
              {...register('expiresOn', {
                validate: (value) => !dayIsPast(value) || 'Choose a day that is still ahead.',
              })}
            />
            <TextField
              label="Limit a minute"
              inputMode="numeric"
              autoComplete="off"
              hint={`A whole number from ${RATE_LIMIT.min} to ${RATE_LIMIT.max}.`}
              error={errors.rateLimitPerMin}
              {...register('rateLimitPerMin', {
                validate: (value) =>
                  parseRateLimit(value) !== null ||
                  `Use a whole number from ${RATE_LIMIT.min} to ${RATE_LIMIT.max}.`,
              })}
            />
          </div>
        </MoreOptions>
      </div>
    </FormDialog>
  );
}
