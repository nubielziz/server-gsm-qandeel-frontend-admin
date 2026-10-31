// ActionButton: a button for something that changes the system (maintenance, pause a queue, acknowledge an alert…). It
// follows the permission rules of docs/system-health-design.md: hidden for a read-only staff member, disabled with the
// reason for one who lacks this one permission. A hint only: the server still checks the permission.
import { useId } from 'react';
import { Button, type ButtonProps } from '@/components/ui';
import { useHealthGrants } from '../hooks/useHealthGrants';

export interface ActionButtonProps extends ButtonProps {
  /** The one permission the action needs ("system:manage", "alerts:update"). */
  permission: string;
}

/**
 * Three outcomes. Read-only (none of the write permissions at all): nothing is drawn, so the page has no dead buttons.
 * Some write permissions but not this one: the button is drawn disabled, with "You need the <permission> permission" as its
 * title and as its description for screen readers. Otherwise it is an ordinary `Button`. While the staff member is still
 * loading nothing is drawn either, so the button never flashes in and out.
 *
 * A disabled button takes no hover, so the tooltip would never show on it. The reason therefore sits as a title on a
 * wrapper too, which does get the hover.
 */
export function ActionButton({ permission, title, disabled, children, ...rest }: ActionButtonProps) {
  const grants = useHealthGrants();
  const reasonId = useId();
  if (!grants.ready || grants.readOnly) return null;

  const need = grants.needs(permission);
  if (!need.disabled) {
    return (
      <Button {...rest} title={title} disabled={disabled}>
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex" title={need.title}>
      <Button {...rest} title={need.title} disabled aria-describedby={reasonId}>
        {children}
      </Button>
      <span id={reasonId} className="sr-only">
        {need.title}
      </span>
    </span>
  );
}
