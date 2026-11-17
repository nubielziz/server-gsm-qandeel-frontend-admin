// GatewayLogoField: the logo of a payment method in its edit dialog: a preview, a file input, Upload and Remove. It saves at once (its own
// requests, not the dialog's Save), like the listing picture field. A client check stops a wrong type or a file over 2 MiB; the server's
// refusal (too small, animated, corrupt…) shows under the control. Feature 32, backend B232 (`POST` and `DELETE …/:id/logo`).
import { useRef, useState } from 'react';
import { Button, errorText, Icon } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { useRemoveGatewayLogo, useUploadGatewayLogo } from '../hooks/useGateways';
import { LOGO_TYPES, logoProblem, methodTypeOf } from '../lib/paymentLogos';
import type { PaymentGateway } from '../types';
import { PaymentMethodLogo } from './PaymentMethodLogo';

/** The server's words for a refused logo: the message under `file`, else the problem's detail. */
function refusal(error: unknown): string {
  if (isApiError(error)) return error.fieldErrors.file?.join(' ') || errorText(error);
  return errorText(error);
}

/** Preview and controls for the logo of one method. */
export function GatewayLogoField({ gateway }: { gateway: PaymentGateway }) {
  const input = useRef<HTMLInputElement>(null);
  // The dialog holds the gateway as it was when it opened, so the field keeps the logo each upload or removal answered.
  const [logoUrl, setLogoUrl] = useState(gateway.logoUrl);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useUploadGatewayLogo();
  const remove = useRemoveGatewayLogo();
  const busy = upload.isPending || remove.isPending;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const stop = logoProblem(file);
    setProblem(stop);
    if (stop) return;
    try {
      setLogoUrl((await upload.mutateAsync({ gateway, file })).logoUrl);
    } catch (error) {
      setProblem(refusal(error));
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const clear = async () => {
    setProblem(null);
    try {
      await remove.mutateAsync(gateway);
      setLogoUrl(null);
    } catch (error) {
      setProblem(refusal(error));
    }
  };

  return (
    <div className="flex items-start gap-3">
      <PaymentMethodLogo
        nameShown
        name={gateway.name}
        logoUrl={logoUrl}
        preset={gateway.preset}
        methodType={methodTypeOf(gateway)}
        size="lg"
      />
      <div className="min-w-0 flex-1">
        <p className="label">Logo</p>
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={LOGO_TYPES.join(',')}
          aria-label="Logo file"
          tabIndex={-1}
          disabled={busy}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={upload.isPending}
            disabled={remove.isPending}
            onClick={() => input.current?.click()}
          >
            <Icon name="upload" className="ic-xs" />
            {logoUrl ? 'Replace logo…' : 'Upload logo…'}
          </Button>
          {logoUrl && (
            <Button
              size="sm"
              loading={remove.isPending}
              disabled={upload.isPending}
              onClick={() => void clear()}
            >
              Remove logo
            </Button>
          )}
        </div>
        <p className="hint">
          JPEG, PNG or WebP, up to 2 MiB, at least 64 pixels on each side. It is saved as soon as you choose
          it.
          {gateway.preset && ' Without your own logo, this method shows the logo of its ready-made method.'}
        </p>
        {problem && (
          <p className="mt-1 text-xs text-crit-fg" role="alert">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
