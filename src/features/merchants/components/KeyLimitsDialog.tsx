// KeyLimitsDialog: "Limits of <key>" (feature 20): the per-minute limit and the allowed addresses of a live key. Only the changed
// value is sent, and nothing at all when none changed. An emptied address box removes the restriction.
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, TextField, dialogSubmit, toast } from '@/components/ui';
import { useUpdateApiKey } from '../hooks/useClientApiKeys';
import {
  foldKeyErrors,
  ipLines,
  MAX_ALLOWED_IPS,
  parseIpLines,
  parseRateLimit,
  RATE_LIMIT,
} from '../lib/keyInput';
import type { ApiKey, UpdateApiKeyBody } from '../types';

type Values = { rateLimitPerMin: string; allowedIps: string };

/** The form for a key's limits. Mounted only while open. */
export function KeyLimitsDialog({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const update = useUpdateApiKey();
  const form = useForm<Values>({
    defaultValues: {
      rateLimitPerMin: String(apiKey.rateLimitPerMin),
      allowedIps: ipLines(apiKey.allowedIps),
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body: UpdateApiKeyBody = {};
      const limit = parseRateLimit(values.rateLimitPerMin);
      if (limit !== null && limit !== apiKey.rateLimitPerMin) body.rateLimitPerMin = limit;
      const ips = parseIpLines(values.allowedIps);
      if (ips.join('\n') !== apiKey.allowedIps.join('\n')) body.allowedIps = ips;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      try {
        await update.mutateAsync({ key: apiKey, body });
      } catch (error) {
        throw foldKeyErrors(error);
      }
    },
    { fields: ['rateLimitPerMin', 'allowedIps'] },
  );

  return (
    <FormDialog
      open
      title={`Limits of ${apiKey.name}`}
      sub={`The key ${apiKey.prefix}… uses the new limits from its next call.`}
      confirm="Save limits"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
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
        <TextareaField
          label="Allowed IP addresses"
          rows={4}
          spellCheck={false}
          hint={`One address or range per line, at most ${MAX_ALLOWED_IPS}. Leave empty to allow any address.`}
          error={errors.allowedIps}
          {...register('allowedIps', {
            validate: (value) =>
              parseIpLines(value).length <= MAX_ALLOWED_IPS || `Use at most ${MAX_ALLOWED_IPS} addresses.`,
          })}
        />
      </div>
    </FormDialog>
  );
}
