// PublishedBadge: the Published or Draft badge of a help article. Ports the inline badge of `tabHelp` in 50-p-storefront.js.
import { Badge } from '@/components/ui';

/** The badge for an article that is either published or a draft. */
export function PublishedBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge tone="good" icon="checkCircle">
      Published
    </Badge>
  ) : (
    <Badge tone="neutral" icon="file">
      Draft
    </Badge>
  );
}
