// GatewaySecretFields: the write-only secrets of the payment method dialog: the API key, the webhook signing secret, an optional second
// webhook secret (with Remove) and the webhook address to register at the provider. The dialog owns the form; the server never sends a secret back.
import type { UseFormReturn } from 'react-hook-form';
import { Button, CopyButton, TextField } from '@/components/ui';
import type { PaymentGateway } from '../types';
import type { GatewayValues } from './GatewayFields';

const STORED = (hint: string) =>
  `Stored (${hint}). Write-only: type a new one to replace it, or leave empty to keep it.`;

/** The path the provider is told to call; the code is part of it, so it is known once the method is saved (the server makes the code). */
const webhookPathOf = (code: string) => `/webhooks/payments/${code}`;

/** The secrets of one gateway. `gateway` is set when editing (its hints say what is stored). */
export function GatewaySecretFields({
  form,
  gateway,
}: {
  form: UseFormReturn<GatewayValues>;
  gateway?: PaymentGateway;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const manual = watch('isManual');
  const removed = watch('secondaryRemoved');
  const secondaryHint = gateway?.secondaryWebhookSecretHint;
  const webhookPath = gateway ? webhookPathOf(gateway.code) : null;
  return (
    <div className="space-y-3">
      <TextField
        label="Secret (API key)"
        type="password"
        autoComplete="new-password"
        hint={
          gateway?.secretHint
            ? STORED(gateway.secretHint)
            : 'Write-only. The server stores it and never shows it again.'
        }
        error={errors.secret}
        {...register('secret')}
      />
      {!manual && (
        <>
          <TextField
            label="Webhook signing secret"
            type="password"
            autoComplete="new-password"
            hint={
              gateway?.webhookSecretHint
                ? STORED(gateway.webhookSecretHint)
                : 'None stored: the gateway’s confirmations are refused until one is set.'
            }
            error={errors.webhookSecret}
            {...register('webhookSecret')}
          />
          <div className="flex items-start gap-2">
            <TextField
              label="Second webhook secret (optional)"
              type="password"
              autoComplete="new-password"
              wrapperClassName="min-w-0 flex-1"
              disabled={removed}
              hint={
                removed
                  ? `The second secret (${secondaryHint}) is removed when you save.`
                  : `${secondaryHint ? `${STORED(secondaryHint)} ` : ''}For a second endpoint or while rotating the secret.`
              }
              error={errors.secondaryWebhookSecret}
              {...register('secondaryWebhookSecret')}
            />
            {secondaryHint && (
              <Button
                size="sm"
                className="mt-6"
                aria-label={removed ? 'Keep the second webhook secret' : 'Remove the second webhook secret'}
                onClick={() => setValue('secondaryRemoved', !removed, { shouldDirty: true })}
              >
                {removed ? 'Keep' : 'Remove'}
              </Button>
            )}
          </div>
          <div>
            <span className="label">Webhook address to register at the provider</span>
            {webhookPath ? (
              <div className="flex items-center gap-1.5">
                <code className="text-xs text-ink2">{webhookPath}</code>
                <CopyButton value={webhookPath} label="webhook address" />
              </div>
            ) : (
              <p className="text-sm text-ink2">
                Made when you save, from the method’s code. Open Edit on the method to copy it.
              </p>
            )}
            <p className="hint">
              One address for payments, refunds and disputes. Type the secret the provider shows for it above.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
