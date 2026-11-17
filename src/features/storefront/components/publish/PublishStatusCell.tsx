// PublishStatusCell: the status of one preview row: a badge with an icon and a word (Ready, Needs a look, Cannot publish), the line
// that says why in the server's terms, and small neutral marks for the soft flags, each with its phrase as a tooltip.
import { Badge, TypeTag } from '@/components/ui';
import { statusView } from '../../lib/publishStatus';
import type { PublishItem } from '../../types';

/** The badge, the reason and the marks of a row. The words come from `lib/publishStatus.ts`. */
export function PublishStatusCell({ item }: { item: PublishItem }) {
  const view = statusView(item);
  return (
    <div className="max-w-[17rem] space-y-1">
      <span title={view.hint}>
        <Badge tone={view.tone} icon={view.icon}>
          {view.label}
        </Badge>
      </span>
      {view.note && <p className="text-2xs text-ink3">{view.note}</p>}
      {view.marks.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {view.marks.map((mark) => (
            <span key={mark.flag} title={mark.title}>
              <TypeTag>{mark.label}</TypeTag>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
