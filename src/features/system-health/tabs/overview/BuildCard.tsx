// BuildCard: the fourth card of the Overview tab: which build runs (version, commit, environment, when it was deployed).
// It reads the build of the health summary (`GET /admin/system/health`, route group `health`).
import { CopyButton, KeyValue } from '@/components/ui';
import { useNow } from '@/lib/format';
import { HealthCard } from '../../components';
import { POLL, useSystemHealth } from '../../hooks';
import type { BuildInfo } from '../../types';
import { WhenText } from './WhenText';

/** The commit is an identifier: mono, with a button to copy it for a bug report or a deploy check. */
function CommitValue({ commit }: { commit: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="mono">{commit}</span>
      <CopyButton value={commit} label="commit" />
    </span>
  );
}

/** Version, commit, environment and the deploy time; a field the server leaves out says so instead of staying blank. */
function BuildBody({ build }: { build: BuildInfo }) {
  const now = useNow(30_000);
  return (
    <KeyValue
      className="items-center"
      rows={[
        ['Version', build.version || 'Unknown'],
        ['Commit', build.commit ? <CommitValue commit={build.commit} /> : 'Unknown'],
        ['Environment', build.environment || 'Unknown'],
        ['Deployed', <WhenText time={build.deployedAt} now={now} empty="Not recorded" />],
      ]}
    />
  );
}

/** The build of the running API. The Grafana link is the page header's, so the card carries none of its own. */
export function BuildCard() {
  const health = useSystemHealth();
  return (
    <HealthCard
      title="Build"
      sub="The version running now."
      query={health}
      interval={POLL.fast}
      permission="system:read"
      errorTitle="Could not load the build"
    >
      {(data) => <BuildBody build={data.build} />}
    </HealthCard>
  );
}
