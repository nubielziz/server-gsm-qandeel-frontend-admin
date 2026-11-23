// PublishRunHeader: the top of a run's page: "Publish run 12", what it took, when and by whom, its status (a square and a word, never colour
// alone) and the way back to the start of the view (the earlier runs), as a plain link.
import { Link } from 'react-router';
import { Icon, SectionHeading } from '@/components/ui';
import { ago } from '@/lib/format';
import { storefrontPublishPath } from '../../lib/paths';
import { scopeText, statusWords } from '../../lib/publish';
import type { PublishRun } from '../../types';
import { StatusMark } from '../StatusMark';

/** The header of a run: title, sub line, status and "All runs". */
export function PublishRunHeader({ run }: { run: PublishRun }) {
  const words = statusWords(run);
  const by = run.auto || run.requestedBy === null ? 'System' : run.requestedByName;
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-[13rem] flex-1">
        <SectionHeading>Publish run {run.id}</SectionHeading>
        <p className="hint">
          {[scopeText(run.scope), `started ${ago(run.createdAt)}`, by ? `by ${by}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <StatusMark tone={words.tone}>{words.label}</StatusMark>
        <Link className="link inline-flex items-center gap-1" to={storefrontPublishPath()}>
          <Icon name="chevL" className="ic-sm" />
          All runs
        </Link>
      </div>
    </div>
  );
}
