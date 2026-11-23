// BackToList: the way out of the service panel on a screen narrower than 2xl, where the panel takes the table's place.
import { Button, Icon } from '@/components/ui';

/** A "Back to the list" button, shown only below 2xl (beside the table the close button is enough). It closes like the X does. */
export function BackToList({ onBack }: { onBack: () => void }) {
  return (
    <div className="mb-4 2xl:hidden">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <Icon name="chevL" className="ic-sm" />
        Back to the list
      </Button>
    </div>
  );
}
