// Avatar: a 20px initials circle (the demo's avatar(name)). The name is always written next to it.
import { cx } from './cx';
import { initials } from './initials';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-line bg-sunken text-2xs font-medium text-ink2',
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
