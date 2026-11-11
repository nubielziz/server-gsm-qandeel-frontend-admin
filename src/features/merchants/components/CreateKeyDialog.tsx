// CreateKeyDialog: "New API key for <merchant>" (feature 20): name, scopes, allowed addresses (one per line), an optional expiry day and the
// per-minute limit (60 unless changed). The key comes back once and is passed to the one-time dialog after this one closes. A 409
// `NOT_ACTIVE` and 422s show in the dialog; `scopes.N` and `allowedIps.N` errors show under their inputs.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, TextareaField, TextField, dialogSubmit } from '@/components/ui';
import { useCreateClientApiKey } from '../hooks/useClientApiKeys';
import { cleanText } from '../lib/input';
import {
  dayIsPast,
  expiryOf,
  foldKeyErrors,
  KEY_SCOPES,
  MAX_ALLOWED_IPS,
  parseIpLines,
  parseRateLimit,
  RATE_LIMIT,
} from '../lib/keyInput';
import type { Client, CreateApiKeyBody } from '../types';

type Values = {
  name: string;
  scopes: string[];
  allowedIps: string;
  expiresOn: string;
  rateLimitPerMin: string;
};
const FIELDS = ['name', 'scopes', 'allowedIps', 'expiresOn', 'rateLimitPerMin'] as const;

export interface CreateKeyDialogProps {
  client: Pick<Client, 'id' | 'name'>;
  onClose: () => void;
  /** Called after the dialog closed with the new key, so it can be shown once. */
  onReveal: (name: string, secret: string) => void;
}

/** The form for a key staff make for a merchant. Mounted only while open. */
export function CreateKeyDialog({ client, onClose, onReveal }: CreateKeyDialogProps) {
  const create = useCreateClientApiKey();
  const revealed = useRef<{ name: string; secret: string } | undefined>(undefined);
  const form = useForm<Values>({
    defaultValues: {
      name: '',
      scopes: [],
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
      const ips = parseIpLines(values.allowedIps);
      const body: CreateApiKeyBody = {
        name: cleanText(values.name),
        scopes: values.scopes,
        ...(ips.length > 0 ? { allowedIps: ips } : {}),
        ...(values.expiresOn ? { expiresAt: expiryOf(values.expiresOn) } : {}),
        rateLimitPerMin: parseRateLimit(values.rateLimitPerMin) ?? RATE_LIMIT.default,
      };
      try {
        const created = await create.mutateAsync({ client, body });
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
      title={`New API key for ${client.name}`}
      sub="The key acts as the merchant. It is shown once and the merchant is emailed a notice."
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
              const name = cleanText(value);
              return name === '' ? 'Name the key.' : name.length > 60 ? 'Use at most 60 characters.' : true;
            },
          })}
        />
        <fieldset aria-invalid={errors.scopes ? true : undefined}>
          <legend className="mb-1 text-sm font-medium">Scopes</legend>
          <div className="space-y-1.5">
            {KEY_SCOPES.map((scope) => (
              <CheckboxField
                key={scope.value}
                label={
                  <>
                    <span className="mono">{scope.value}</span>{' '}
                    <span className="text-ink3">{scope.hint}</span>
                  </>
                }
                value={scope.value}
                {...register('scopes', {
                  validate: (value) => (value && value.length > 0) || 'Choose at least one scope.',
                })}
              />
            ))}
          </div>
          {errors.scopes && (
            <p className="mt-1 text-xs text-crit-fg" role="alert">
              {typeof errors.scopes.message === 'string' ? errors.scopes.message : 'Check the scopes.'}
            </p>
          )}
        </fieldset>
        <TextareaField
          label="Allowed IP addresses"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <TextField
              label="Expires on (optional)"
              type="date"
              hint="The key stops working at the end of that day."
              error={errors.expiresOn}
              {...register('expiresOn', {
                validate: (value) => !dayIsPast(value) || 'Choose a day that is still ahead.',
              })}
            />
          </div>
          <TextField
            label="Calls per minute"
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
      </div>
    </FormDialog>
  );
}
