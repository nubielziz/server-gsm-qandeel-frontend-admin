// A test host for the bulk actions on ticked services (`useServicesBulk`) on its own: it lists the services a search finds (or the ids given),
// one button per action over all of them, and shows what each action hands back (the summary of the refused, the run to open). The list is
// read under the shared rows key, so the refresh the hook makes after an action reads it again. Import it from tests only.
import { useState } from 'react';
import { BulkSummaryDialog, type BulkSummary } from '@/components/ui';
import type { Id } from '@/lib/api';
import { SERVICE_ROWS_KEY, useApiQuery } from '@/lib/query';
import { listServices } from '../api';
import { useServicesBulk, type BulkResult } from '../hooks/useServicesBulk';
import type { ServiceCategory } from '../types';

const LICENSES: ServiceCategory = {
  id: 7,
  name: 'Licenses',
  type: 'server',
  allowedGroupIds: [],
  sort: 0,
  isActive: true,
};

/** The services found by `q` (only `ids` of them when given), with the six actions and what they hand back. */
export function BulkProbe({ q, ids }: { q: string; ids?: readonly Id[] }) {
  const bulk = useServicesBulk();
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [runId, setRunId] = useState<Id | null>(null);
  const rows = useApiQuery({
    queryKey: [...SERVICE_ROWS_KEY, 'bulk-probe', q],
    queryFn: ({ signal }) => listServices({ q, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result) => result.data,
  });
  const services = (rows.data ?? []).filter((service) => !ids || ids.includes(service.id));

  const run = (work: Promise<BulkResult>) =>
    void work.then((result) => {
      setSummary(result.summary);
      setRunId(result.runId);
    });

  return (
    <div>
      <p>{services.length} services</p>
      <button onClick={() => run(bulk.moveTo(services, LICENSES))}>Move to group</button>
      <button onClick={() => run(bulk.enable(services))}>Enable</button>
      <button onClick={() => run(bulk.disable(services))}>Disable</button>
      <button onClick={() => run(bulk.remove(services))}>Delete</button>
      <button onClick={() => run(bulk.takeOff(services))}>Take off the shop</button>
      <button onClick={() => run(bulk.putOn(services))}>Put on the shop</button>
      {runId !== null && <p>Run {runId} is to be opened</p>}
      {summary && (
        <BulkSummaryDialog
          summary={summary}
          onClose={() => setSummary(null)}
          unit={{ one: 'service', many: 'services' }}
        />
      )}
    </div>
  );
}
