// CopyButton: small icon button that copies a value (endpoint, key, ID). Ports the data-act="copy" buttons.
import { Button } from './Button';
import { copyText } from './copyText';
import { Icon } from './Icon';

export interface CopyButtonProps {
  value: string;
  /** What is copied ("endpoint"); used in the button name and the confirmation toast. */
  label?: string;
}

export function CopyButton({ value, label = 'value' }: CopyButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon
      aria-label={`Copy ${label}`}
      onClick={() => {
        void copyText(value, `Copied ${label}`);
      }}
    >
      <Icon name="copy" className="ic-sm" />
    </Button>
  );
}
