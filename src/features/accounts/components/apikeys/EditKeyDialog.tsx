// EditKeyDialog: "Edit key" for a key that is not revoked (decision 039): its name, the Permissions section (the addresses that may use it and the
// day it is valid until) and, under "More options", the limit a minute. Only a changed value is sent, and nothing at all when none changed ("Nothing
// changed"); an emptied address box removes the restriction and an emptied day removes the end (`expiresAt: null`). The server's refusals show under
// their fields or in the dialog: a change that gives the key more reach is for the Owner (403, in the server's words).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, MoreOptions, TextField, toast } from '@/components/ui';
import { useUpdateApiKey } from '../../hooks/useAccountApiKeys';
import type { ApiKey } from '../../types';
import {
  cleanKeyName,
  dayOf,
  editBody,
  foldKeyErrors,
  ipLines,
  KEY_NAME_MAX,
  parseRateLimit,
  RATE_LIMIT,
} from './keyInput';
import { PermissionsFields, type KeyFormValues } from './PermissionsFields';

const FIELDS = ['name', 'allowedIps', 'validUntil', 'rateLimitPerMin'] as const;

/** The form for a key. Mounted only while open, so it starts from the key as it is. */
export function EditKeyDialog({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const update = useUpdateApiKey();
  const unchangedDay = dayOf(apiKey.expiresAt);
  const form = useForm<KeyFormValues>({
    defaultValues: {
      name: apiKey.name,
      allowedIps: ipLines(apiKey.allowedIps),
      validUntil: unchangedDay,
      rateLimitPerMin: String(apiKey.rateLimitPerMin),
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = editBody(apiKey, values);
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
    { fields: FIELDS, aliases: { expiresAt: 'validUntil' } },
  );

  return (
    <FormDialog
      open
      title="Edit key"
      sub={`The key ${apiKey.prefix}… uses the changes from its next call.`}
      confirm="Save changes"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Name"
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
        <PermissionsFields form={form} rows={4} unchangedDay={unchangedDay} />
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
