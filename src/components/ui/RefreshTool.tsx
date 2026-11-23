// RefreshTool: the row of tool icons at the right above a list (the layout the owner asked for), holding the one tool the console has: read
// the list again.
import { Button } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';

export interface RefreshToolProps {
  onRefresh: () => void;
  /** A read is running: the icon turns. */
  busy?: boolean;
  /** The button's name and tooltip. Default "Refresh the list". */
  label?: string;
}

/** A ghost icon button at the right edge, between the Quick Search box and the table. */
export function RefreshTool({ onRefresh, busy = false, label = 'Refresh the list' }: RefreshToolProps) {
  return (
    <div className="mb-1 mt-3 flex justify-end">
      <Button size="sm" variant="ghost" icon aria-label={label} title={label} onClick={onRefresh}>
        <Icon name="refresh" className={cx('ic-sm', busy && 'animate-spin')} />
      </Button>
    </div>
  );
}
