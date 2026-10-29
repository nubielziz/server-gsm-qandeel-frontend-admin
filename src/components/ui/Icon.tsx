// Inline SVG icon from the demo's icon set. Ports ICONS and icon(name, cls) from 00-util.js.
import type { SVGProps } from 'react';
import { ICON_PATHS, type IconName } from './iconPaths';

export type { IconName };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName;
}

/**
 * A 16px stroke icon (`ic`); add `ic-sm` (14px) or `ic-xs` (12px) through className.
 * It is decorative by default (aria-hidden): put the meaning in text or an aria-label on the control.
 */
export function Icon({ name, className, ...rest }: IconProps) {
  return (
    <svg
      className={className ? `ic ${className}` : 'ic'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      // Static, trusted markup from iconPaths.ts: never user input.
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      {...rest}
    />
  );
}
