// PublishStatusCell: the status of one preview row: a square and a word (Ready, Needs a look, Cannot publish), the line that says why in
// the server's terms, and small italic words for the soft flags, each with its phrase as a tooltip.
import { statusView } from '../../lib/publishStatus';
import type { PublishItem } from '../../types';
import { StatusMark } from '../StatusMark';

/** The square and word, the reason and the marks of a row. The words come from `lib/publishStatus.ts`. */
export function PublishStatusCell({ item }: { item: PublishItem }) {
  const view = statusView(item);
  return (
    <div className="max-w-[17rem] space-y-1">
      <span title={view.hint}>
        <StatusMark tone={view.tone}>{view.label}</StatusMark>
      </span>
      {view.note && <span className="cell-sub">{view.note}</span>}
      {view.marks.length > 0 && (
        <span className="flex flex-wrap gap-x-2 text-xs italic text-ink3">
          {view.marks.map((mark) => (
            <span key={mark.flag} title={mark.title}>
              {mark.label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
