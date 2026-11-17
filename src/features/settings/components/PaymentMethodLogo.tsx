// PaymentMethodLogo: the picture of a payment method, in one place (feature 32). The order: the logo staff uploaded, else the bundled
// logo of the ready-made method it came from, else a generic icon (a bank, a coin or a card). Used by the cards, the gallery and the dialog.
import { useState } from 'react';
import { cx, Icon } from '@/components/ui';
import { bundledLogo, fallbackIcon, logoSrc } from '../lib/paymentLogos';
import type { GatewayMethodType } from '../types';

export interface PaymentMethodLogoProps {
  /** The method's name: the picture's alternative text. */
  name: string;
  /** The uploaded logo's public path; wins over everything else. */
  logoUrl?: string | null;
  /** The key of the ready-made method it was made from; it names the bundled logo. */
  preset?: string | null;
  /** What the method stands for, which picks the icon when there is no logo. */
  methodType: GatewayMethodType;
  /**
   * True where the method's name is printed next to the logo (a card, a table row, a dialog): the picture then takes an empty alternative
   * text, so a screen reader does not say the name twice. Without it the picture's alternative text is "<name> logo".
   */
  nameShown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = { sm: 'size-8', md: 'size-10', lg: 'size-16' } as const;
// The icon is drawn at 16px by default (`.ic`); a utility class sets a larger one for the larger boxes.
const ICON_SIZE = { sm: undefined, md: 'size-5', lg: 'size-8' } as const;

/**
 * A square logo box. `data-logo-source` says which of the three was drawn (`uploaded`, `bundled`, `icon`), and `data-logo-icon` which icon. A picture that fails to load
 * (a file removed from the media store) falls to the next one in the order instead of showing a broken image.
 */
export function PaymentMethodLogo({
  name,
  logoUrl,
  preset,
  methodType,
  nameShown = false,
  size = 'md',
  className,
}: PaymentMethodLogoProps) {
  const [broken, setBroken] = useState<readonly string[]>([]);
  const bundled = bundledLogo(preset);
  const pictures = [
    ...(logoUrl ? [{ source: 'uploaded', src: logoSrc(logoUrl) }] : []),
    ...(bundled ? [{ source: 'bundled', src: bundled }] : []),
  ].filter((picture) => !broken.includes(picture.src));
  const shown = pictures[0];
  const icon = fallbackIcon(methodType);
  return (
    <span
      data-logo-source={shown?.source ?? 'icon'}
      data-logo-icon={shown ? undefined : icon}
      className={cx(
        'grid shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white text-ink3',
        SIZE[size],
        className,
      )}
    >
      {shown ? (
        <img
          src={shown.src}
          alt={nameShown ? '' : `${name} logo`}
          className="size-full object-contain p-1"
          onError={() => setBroken((current) => [...current, shown.src])}
        />
      ) : (
        <Icon name={icon} className={ICON_SIZE[size]} />
      )}
    </span>
  );
}
