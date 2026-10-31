// TableViewToggle: the "Table view" button under a chart or the uptime bars. It swaps the picture for a real table.
import { Button, Icon, cx } from '@/components/ui';

export interface TableViewToggleProps {
  /** True while the table is shown. */
  pressed: boolean;
  onToggle: () => void;
}

/** A toggle button (`aria-pressed`), so the label stays "Table view" and the state is spoken. */
export function TableViewToggle({ pressed, onToggle }: TableViewToggleProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-pressed={pressed}
      className={cx(pressed && 'bg-sunken')}
      onClick={onToggle}
    >
      <Icon name="orders" className="ic-sm" />
      Table view
    </Button>
  );
}
