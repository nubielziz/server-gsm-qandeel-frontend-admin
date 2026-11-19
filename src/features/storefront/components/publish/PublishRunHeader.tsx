// PublishRunHeader: the top of a run's page: "Publish run 12", what it took, when and by whom, its status and the way back to the
// start of the tab (the earlier runs). The status is a badge with an icon and a word, never colour alone.
import { Badge, ButtonLink, Icon } from '@/components/ui';
import { ago } from '@/lib/format';
import { storefrontPublishPath } from '../../lib/paths';
import { scopeText, statusWords } from '../../lib/publish';
import type { PublishRun } from '../../types';

/** The header of a run: title, sub line, status and "All runs". */
export function PublishRunHeader({ run }: { run: PublishRun }) {
  const words = statusWords(run);
  const by = run.auto || run.requestedBy === null ? 'System' : run.requestedByName;
  return (
    <div className="panel-h !border-b-0">
      <div className="min-w-[13rem] flex-1">
        <h2 className="panel-t">Publish run {run.id}</h2>
        <p className="panel-s">
          {[scopeText(run.scope), `started ${ago(run.createdAt)}`, by ? `by ${by}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <Badge tone={words.tone} icon={words.icon}>
        {words.label}
      </Badge>
      <ButtonLink variant="ghost" size="sm" to={storefrontPublishPath()}>
        <Icon name="chevL" className="ic-sm" />
        All runs
      </ButtonLink>
    </div>
  );
}
