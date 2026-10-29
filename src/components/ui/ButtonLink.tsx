// ButtonLink: a react-router Link that looks like a Button (same classes as the demo's anchor-buttons).
import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClass, type ButtonStyle } from './buttonClass';

export interface ButtonLinkProps extends LinkProps, ButtonStyle {}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, icon, className, ...rest },
  ref,
) {
  return <Link ref={ref} className={buttonClass({ variant, size, icon, className })} {...rest} />;
});
