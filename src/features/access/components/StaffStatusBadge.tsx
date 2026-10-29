// StaffStatusBadge: the status of an admin account as a badge with an icon and a word. Ports adminBadge and ADMIN_STATUS.
import { Badge, type BadgeTone, type IconName } from '@/components/ui';
import type { StaffMember } from '../types';

const STATUS: Record<StaffMember['status'], [tone: BadgeTone, icon: IconName, text: string]> = {
  active: ['good', 'checkCircle', 'Active'],
  invited: ['neutral', 'clock', 'Invited'],
  suspended: ['warn', 'pause', 'Suspended'],
};

export function StaffStatusBadge({ status }: { status: StaffMember['status'] }) {
  const [tone, icon, text] = STATUS[status];
  return (
    <Badge tone={tone} icon={icon}>
      {text}
    </Badge>
  );
}
