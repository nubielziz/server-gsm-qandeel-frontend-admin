// YesNo: the two-part switch ("Yes | No", "Active | Inactive") of the Product / Services forms (the layout the owner asked for).

export interface YesNoProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Words of the two parts. Default "Yes" and "No". */
  yes?: string;
  no?: string;
  disabled?: boolean;
  title?: string;
  /** Names the switch when no visible label is tied to it. */
  'aria-label'?: string;
  /** Lets a <label htmlFor> (FormRow) name the switch. */
  id?: string;
}

/**
 * One button with the switch role: a screen reader hears "Status, switch, on", and a click anywhere on it flips the value (both parts
 * are shown, the chosen one is filled and bold). Name it with an aria-label or a label tied to `id`; without either, the
 * name falls back to the two words.
 */
export function YesNo({
  value,
  onChange,
  yes = 'Yes',
  no = 'No',
  disabled,
  title,
  id,
  'aria-label': ariaLabel,
}: YesNoProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      className="yesno"
      aria-checked={value}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!value)}
    >
      <span className="yesno-on">{yes}</span>
      <span className="yesno-off">{no}</span>
    </button>
  );
}
