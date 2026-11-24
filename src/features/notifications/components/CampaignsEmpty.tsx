// CampaignsEmpty: what the campaign list says when it has no rows: no campaign yet (and how to write one), or nothing matches the filters.
import { Button, EmptyState, Icon } from '@/components/ui';

export interface CampaignsEmptyProps {
  filtered: boolean;
  canWrite: boolean;
  onClear: () => void;
  onCreate: () => void;
}

export function CampaignsEmpty({ filtered, canWrite, onClear, onCreate }: CampaignsEmptyProps) {
  if (filtered) {
    return (
      <EmptyState
        icon="bell"
        title="No campaigns match"
        cta={
          <Button size="sm" onClick={onClear}>
            Clear filters
          </Button>
        }
      >
        Change the search or the filters.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="bell"
      title="No campaigns yet"
      cta={
        canWrite ? (
          <Button variant="primary" size="sm" onClick={onCreate}>
            <Icon name="plus" className="ic-sm" />
            New campaign
          </Button>
        ) : undefined
      }
    >
      A campaign is a message you write once and send to staff, merchants or retail accounts, in the app or by
      email.
    </EmptyState>
  );
}
