// IndexStatusPanel: the Index section of the Search tab: the engine's state, how complete the index is, the last run of each job,
// the queues, the last error, and the Rebuild index button behind a confirmation. While a rebuild runs the status is read every
// 5 seconds and the button waits. Reads need storefront:read; the rebuild needs storefront:publish.
import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  Icon,
  KeyValue,
  Panel,
  QueryState,
  SkeletonStat,
  StatGrid,
} from '@/components/ui';
import { ago, fmtDate, num } from '@/lib/format';
import { useRebuildIndex } from '../../hooks/useSearchMutations';
import { useSearchIndex } from '../../hooks/useSearchAdmin';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { bytesText, documentsNote, ENGINE_BADGE, engineNote, lastErrorHint } from '../../lib/search';

/** "05 Mar, 14:07 (5m ago)", or "Never". */
function when(time: string | null): string {
  return time ? `${fmtDate(time)} (${ago(time)})` : 'Never';
}

/** The figures, the details, the last error and the rebuild. */
export function IndexStatusPanel({ grants }: { grants: StorefrontGrants }) {
  const index = useSearchIndex(grants.can('storefront:read'));
  const rebuild = useRebuildIndex();
  const [confirming, setConfirming] = useState(false);
  const publish = grants.needs('storefront:publish');
  const status = index.data;
  const running = status?.rebuild.running ?? false;
  const off = status?.engine.status === 'disabled';

  const button = (
    <Button
      variant="primary"
      size="sm"
      disabled={publish.disabled || running || off || !status}
      loading={running}
      title={publish.title ?? (off ? 'Search is switched off in this environment' : undefined)}
      onClick={() => setConfirming(true)}
    >
      <Icon name="refresh" className="ic-sm" />
      {running ? 'Rebuilding…' : 'Rebuild index…'}
    </Button>
  );

  return (
    <>
      <QueryState
        isLoading={index.isLoading}
        isError={index.isError && !status}
        error={index.error}
        onRetry={() => void index.refetch()}
        errorTitle="Could not load the search index"
        skeleton={<SkeletonStat cells={4} />}
      >
        {status && (
          <StatGrid
            label="Search index figures"
            cells={[
              {
                label: 'Engine',
                value: (
                  <Badge
                    tone={ENGINE_BADGE[status.engine.status].tone}
                    icon={ENGINE_BADGE[status.engine.status].icon}
                  >
                    {ENGINE_BADGE[status.engine.status].word}
                  </Badge>
                ),
                sub: engineNote(status.engine.status, status.engine.version),
              },
              {
                label: 'Services indexed',
                value: `${num(status.documents)} of ${num(status.expectedDocuments)}`,
                sub: documentsNote(status.documents, status.expectedDocuments),
                className: status.documents === status.expectedDocuments ? undefined : 'text-warn-fg',
              },
              { label: 'Updates queued', value: num(status.queued), sub: 'waiting to reach the index' },
              {
                label: 'Updates failed',
                value: num(status.failed),
                sub: 'jobs that gave up',
                className: status.failed > 0 ? 'text-crit-fg' : undefined,
              },
            ]}
          />
        )}
      </QueryState>
      <Panel
        title="Search index"
        sub={
          running && status?.rebuild.startedAt ? (
            <span role="status" className="inline-flex items-center gap-1.5">
              <Icon name="loader" className="ic-xs animate-spin" />
              Rebuild running since {fmtDate(status.rebuild.startedAt)}. Search keeps answering from the
              current index.
            </span>
          ) : (
            'The index is rebuilt every night and kept up to date as services change. Rebuild it by hand after a bulk import or when the count above is wrong.'
          )
        }
        right={button}
      >
        {status ? (
          <>
            <KeyValue
              rows={[
                ['Memory used', bytesText(status.engine.memoryBytes)],
                ['Schema version', String(status.schemaVersion)],
                [
                  'Collection',
                  status.collection ? <span className="mono">{status.collection}</span> : 'None yet',
                ],
                ['Last update from a change', when(status.lastSyncAt)],
                ['Last check against the database', when(status.lastReconcileAt)],
                ['Last rebuild', when(status.lastRebuildAt)],
                ['Last phrase list build', when(status.lastTermsBuildAt)],
              ]}
            />
            <div className="mt-3">
              <p className="label">Last error</p>
              {status.lastError ? (
                <>
                  <p className="mono break-words rounded-md border border-line bg-sunken px-2.5 py-2 text-xs text-crit-fg">
                    {status.lastError}
                  </p>
                  {lastErrorHint(status.lastError) && (
                    <p className="mt-1.5 text-sm text-ink2">{lastErrorHint(status.lastError)}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink2">None.</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink2">The index status is not loaded yet.</p>
        )}
      </Panel>
      {confirming && (
        <ConfirmDialog
          open
          title="Rebuild the search index?"
          confirm="Rebuild index"
          body={
            <>
              <p>
                This builds a new index from the catalogue and switches search to it when it is complete.
                Search keeps working while it builds; changes made in the meantime are picked up when it
                finishes.
              </p>
              <p className="mt-2">
                It takes a few minutes for a large catalogue. The audit log records who started it.
              </p>
            </>
          }
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await rebuild.mutateAsync();
          }}
        />
      )}
    </>
  );
}
