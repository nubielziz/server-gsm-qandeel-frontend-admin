// AuthenticatorSetup: the QR code and the setup key shown on the first-time two-step verification screen.
import { CopyButton } from '@/components/ui';
import type { TwoFactorSetup } from '../types';

// "JBSWY3DPEHPK3PXP" is easier to read and to type in groups of four. The copy button still copies it whole.
function groupsOfFour(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, '$1 ');
}

/**
 * The QR code goes into an <img> as a data URL, never into the page as markup: an image cannot run scripts, so a
 * faulty or hostile SVG from the server stays harmless. The white tile keeps the code scannable in dark mode.
 */
export function AuthenticatorSetup({ setup }: { setup: TwoFactorSetup }) {
  return (
    <div className="space-y-3">
      {setup.qrSvg && (
        <img
          className="h-44 w-44 rounded-md border border-line bg-white p-2"
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`}
          alt="QR code to scan with your authenticator app"
        />
      )}
      <div className="flex items-center gap-2 rounded-md border border-line bg-sunken px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink2">
            {setup.qrSvg ? 'Or enter this key' : 'Enter this key'}
          </p>
          <p className="mono break-all select-all">{groupsOfFour(setup.secret)}</p>
        </div>
        <CopyButton value={setup.secret} label="setup key" />
      </div>
    </div>
  );
}
