// AuthenticatorSetup: the QR code and the setup key of first-time two-step setup (POST /admin/auth/2fa/setup).
import { copyText, Icon } from '@/components/ui';
import type { TwoFactorSetup } from '../types';

/** "JBSWY3DPEHPK3PXP" as "JBSW Y3DP EHPK 3PXP", easier to read out and to type. */
function groupsOfFour(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, '$1 ');
}

/**
 * The QR code to scan (on white in both themes, since scanners need the contrast) and the key to type instead, with a
 * 44px copy button.
 */
export function AuthenticatorSetup({ setup }: { setup: TwoFactorSetup }) {
  return (
    <div className="space-y-4">
      {setup.qrSvg && (
        <img
          className="mx-auto h-44 w-44 rounded-lg border border-line bg-white p-2"
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`}
          alt="QR code to scan with your authenticator app"
        />
      )}
      <div className="flex items-center gap-1 rounded-lg border border-line bg-sunken py-1 pe-1 ps-3.5">
        <div className="min-w-0 flex-1 py-1.5">
          <p className="text-xs font-medium text-ink2">
            {setup.qrSvg ? 'Or enter this key' : 'Enter this key'}
          </p>
          <p className="mt-0.5 break-all font-mono text-sm text-ink select-all">
            {groupsOfFour(setup.secret)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Copy setup key"
          onClick={() => void copyText(setup.secret, 'Copied setup key')}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-md text-ink2 transition-colors hover:bg-hover hover:text-ink motion-reduce:transition-none"
        >
          <Icon name="copy" />
        </button>
      </div>
    </div>
  );
}
