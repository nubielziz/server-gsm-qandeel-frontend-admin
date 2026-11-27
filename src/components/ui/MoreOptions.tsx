// MoreOptions: the fold at the end of a form that holds the inputs most people never change (decision 035). The form shows what must be
// typed; what has a good default sits here, one click away. The inputs stay in the page while the fold is closed (only hidden), so a form
// library keeps their values and a message can still find its field.
import { useId, useState, type ReactNode } from 'react';
import { cx } from './cx';

/** The title of the button while an error holds the fold open. */
const FORCED_TITLE = 'Open while a value here needs attention';

export interface MoreOptionsProps {
  /** The words on the button. */
  label?: string;
  /** Opens the fold from the start: a record being edited whose hidden values are not the defaults. */
  defaultOpen?: boolean;
  /**
   * Keeps the fold open whatever was clicked: a hidden input holds an error the person must see. The button keeps the words it has when
   * open but is marked `aria-disabled` and says why in its title; a click does nothing.
   */
  forceOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * A button that shows or hides the inputs inside it. It says whether it is open (`aria-expanded`) and names the region it controls. While
 * `forceOpen` is true the region cannot be closed, so an error under a hidden input is never out of sight: the button is `aria-disabled`
 * (not `disabled`, so it can still be focused and read) and its title says why.
 */
export function MoreOptions({
  label = 'More options',
  defaultOpen = false,
  forceOpen = false,
  children,
  className,
}: MoreOptionsProps) {
  const id = useId();
  const [chosen, setChosen] = useState(defaultOpen);
  const open = chosen || forceOpen;
  return (
    <div className={cx('min-w-0', className)}>
      <button
        type="button"
        className={cx('link text-sm', forceOpen && 'cursor-default opacity-60')}
        aria-expanded={open}
        aria-controls={id}
        aria-disabled={forceOpen || undefined}
        title={forceOpen ? FORCED_TITLE : undefined}
        onClick={() => {
          if (!forceOpen) setChosen(!open);
        }}
      >
        {open ? `Hide ${label.toLowerCase()}` : label}
      </button>
      <div id={id} hidden={!open} className="mt-2">
        {children}
      </div>
    </div>
  );
}
