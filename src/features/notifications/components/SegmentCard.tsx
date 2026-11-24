// SegmentCard: one group of the audience (staff, merchants, retail) with its on/off switch; the filters of the group show while it is on.
import type { ReactNode } from 'react';
import { Switch } from '@/components/ui';

export interface SegmentCardProps {
  title: string;
  description: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  children?: ReactNode;
}

export function SegmentCard({ title, description, on, onToggle, children }: SegmentCardProps) {
  return (
    <div className="rounded-md border border-line2">
      <div className="flex items-start gap-3 p-3">
        <Switch checked={on} onChange={onToggle} label={`Target ${title.toLowerCase()}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-ink3">{description}</p>
        </div>
      </div>
      {on && children && <div className="space-y-3 border-t border-line p-3">{children}</div>}
    </div>
  );
}
