// BrandMark: the IMEI-HUB mark (the "IH" in its orbit), the owner's logo. Two files of the same drawing: dark ink for the
// light theme, white ink for the dark one; the style sheet shows the one that fits the theme (styles/index.css).
import markDark from '@/assets/brand/logo-mark-inverse.png';
import markLight from '@/assets/brand/logo-mark.png';
import { cx } from './cx';

/** The pixel size of the two files: the mark is wider than it is tall, and keeps that shape at any height. */
const FILE = { width: 149, height: 112 };

export interface BrandMarkProps {
  /** The height in pixels; the width follows the mark's shape. Default 26. */
  height?: number;
  className?: string;
}

/** Decorative: the name is always printed beside it. */
export function BrandMark({ height = 26, className }: BrandMarkProps) {
  const width = Math.round((height * FILE.width) / FILE.height);
  return (
    <span aria-hidden="true" className={cx('brand-mark flex-none', className)} style={{ width, height }}>
      <img className="brand-mark-light" src={markLight} alt="" width={width} height={height} />
      <img className="brand-mark-dark" src={markDark} alt="" width={width} height={height} />
    </span>
  );
}
