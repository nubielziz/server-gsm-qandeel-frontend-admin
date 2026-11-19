// RetailRulePreviewView: step two of the rule dialog: what the follow pass would do once the rule is saved, in the server's
// own figures: how many prices change, up and down, which are held at their floor, the services left with no rule, and the
// biggest changes. It draws the preview it is given and works out nothing.
import { Button } from '@/components/ui';
import { num } from '@/lib/format';
import { atFloorText, noRuleText, previewSummary } from '../../lib/retailPricing';
import type { RetailRulePreview } from '../../types';
import { RetailPreviewLines } from './RetailPreviewLines';

export interface RetailRulePreviewViewProps {
  preview: RetailRulePreview;
  /** Goes back to the form with the values kept. */
  onBack: () => void;
}

/** The summary, the notes and the lines table. */
export function RetailRulePreviewView({ preview, onBack }: RetailRulePreviewViewProps) {
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{previewSummary(preview)}</span>
        <Button size="sm" variant="ghost" onClick={onBack}>
          Change the settings
        </Button>
      </p>
      {preview.atFloor > 0 && (
        <p className="rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">{atFloorText(preview.atFloor)}</p>
      )}
      {preview.noRule > 0 && <p className="text-sm text-ink2">{noRuleText(preview.noRule)}</p>}
      {preview.truncated && (
        <p className="rounded-md bg-sunken p-2.5 text-sm text-ink2">
          Too many services are in reach, so these figures cover only the first part of them.
        </p>
      )}
      {preview.lines.length > 0 ? (
        <>
          <RetailPreviewLines lines={preview.lines} />
          {preview.changes > preview.lines.length && (
            <p className="text-xs text-ink3">The {num(preview.lines.length)} biggest changes are listed.</p>
          )}
        </>
      ) : (
        <p className="text-sm text-ink2">No price would change.</p>
      )}
    </div>
  );
}
