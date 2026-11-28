// Flag: the round flag of a country, before its name in a country list and inside a phone box. The pictures are the files of
// `public/flags` (`<iso code>.svg`, the MIT "circle-flags" set: docs/decisions/040). A flag only decorates a name written next to it (or a
// button that has its own name), so it has no alternative text. A code with no file shows the globe icon instead of a broken picture.
import { useState } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface FlagProps {
  /** ISO 3166-1 alpha-2 code, any case. Anything else (an empty choice) draws the globe. */
  code: string;
  className?: string;
}

/** A 16px flag, or the globe when the code is not a country's or its file is missing. */
export function Flag({ code, className }: FlagProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const file = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(file) || failed === file) {
    return <Icon name="globe" className={cx('flex-none text-ink3', className)} />;
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}flags/${file}.svg`}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      decoding="async"
      className={cx('h-4 w-4 flex-none rounded-full', className)}
      onError={() => setFailed(file)}
    />
  );
}
