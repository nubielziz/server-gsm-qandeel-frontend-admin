// IndeterminateCheckbox: a checkbox that can show the "some selected" dash (the demo's data-indeterminate hook).
import { useEffect, useRef, type InputHTMLAttributes } from 'react';
import { cx } from './cx';

export interface IndeterminateCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
}

/** `indeterminate` is a DOM property with no HTML attribute, so it has to be set from an effect. */
export function IndeterminateCheckbox({
  indeterminate = false,
  className,
  ...rest
}: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" className={cx('check', className)} {...rest} />;
}
