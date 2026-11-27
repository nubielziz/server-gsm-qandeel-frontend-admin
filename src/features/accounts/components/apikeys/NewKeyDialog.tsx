// NewKeyDialog: "New API key for <account>" ("Key with limits…" on the part): an optional name and the Permissions section (the addresses the key may be
// used from, one per line, and the day it is valid until, decision 039); the per-minute limit (60 unless changed) sits in a "More options" fold
// (decision 035). The one-click "Generate API key" on the part makes a key with none of this. The key acts as the account, so only the Owner makes
// one (the part's buttons say so). The key comes back once; this dialog hands it to the one-time dialog after it has closed. A 409 `NOT_ACTIVE`, a
// 403 and a 422 show in the dialog; `allowedIps.N` errors show under the box with the number of the line.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, MoreOptions, TextField } from '@/components/ui';
import { useCreateAccountApiKey } from '../../hooks/useAccountApiKeys';
import type { AccountRow, CreateApiKeyBody } from '../../types';
import { accountLabel } from '../shared/accountLabel';
import {
  cleanKeyName,
  expiryOf,
  foldKeyErrors,
  KEY_NAME_MAX,
  parseIpLines,
  parseRateLimit,
  RATE_LIMIT,
} from './keyInput';
import { PermissionsFields, type KeyFormValues } from './PermissionsFields';

const FIELDS = ['name', 'allowedIps', 'validUntil', 'rateLimitPerMin'] as const;

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
  const form = useForm<KeyFormValues>({
    defaultValues: { name: '', allowedIps: '', validUntil: '', rateLimitPerMin: String(RATE_LIMIT.default) },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const name = cleanKeyName(values.name);
      const addresses = parseIpLines(values.allowedIps);
      // A name left empty is left out of the body: the server names the key.
      const body: CreateApiKeyBody = {
        ...(name === '' ? {} : { name }),
        ...(addresses.length > 0 ? { allowedIps: addresses } : {}),
        ...(values.validUntil ? { expiresAt: expiryOf(values.validUntil) } : {}),
        rateLimitPerMin: parseRateLimit(values.rateLimitPerMin) ?? RATE_LIMIT.default,
      };
      try {
        const created = await create.mutateAsync({ account, body });
        revealed.current = { name: created.key.name, secret: created.secret };
      } catch (error) {
        throw foldKeyErrors(error);
      }
    },
    { fields: FIELDS, aliases: { expiresAt: 'validUntil' } },
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
          hint="Empty: the system names it."
          error={errors.name}
          {...register('name', {
            validate: (value) =>
              cleanKeyName(value).length <= KEY_NAME_MAX || `Use at most ${KEY_NAME_MAX} characters.`,
          })}
        />
        <PermissionsFields form={form} />
        {/* The limit keeps its default (60) and is sent as before; a message under it opens the fold. */}
        <MoreOptions forceOpen={Boolean(errors.rateLimitPerMin)}>
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
        </MoreOptions>
      </div>
    </FormDialog>
  );
}
