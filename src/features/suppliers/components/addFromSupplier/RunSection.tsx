// RunSection: the progress and the result of an add, in place under the rows of the Add-from-supplier form (no dialog): the quick add run
// with its progress bar for whole groups, and the answer of every batch for single services, with the server's words when something failed.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Meter, SectionHeading } from '@/components/ui';
import { productsPath } from '@/features/services';
import { storefrontPricingPath } from '@/features/storefront';
import { num } from '@/lib/format';
import { QuickAddProgress } from '../QuickAddProgress';
import { sentOf } from '../../lib/singlesFlow';
import type { AddState } from './hooks/useAddFromSupplier';
import { SinglesResultList } from './SinglesResultList';

/** The words of a failure, in the critical colour, announced when they appear. */
function Failure({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-crit-fg" role="alert">
      {children}
    </p>
  );
}

/** The run of the whole-groups path: what the server says of it, and where to find what it added. */
function GroupsRun({ add }: { add: AddState }) {
  const { run, query, failure } = add.groups;
  if (!run && !failure) return null;
  return (
    <section aria-label="Progress" className="space-y-3">
      <SectionHeading>Progress</SectionHeading>
      {failure && (
        <Failure>
          {failure.text}
          {failure.noRule && (
            <>
              {' '}
              <Link className="underline" to={storefrontPricingPath()}>
                Open the shop price rules
              </Link>
            </>
          )}
        </Failure>
      )}
      {run && <QuickAddProgress run={run} query={query} />}
      {run?.status === 'succeeded' && (
        <Link className="link text-sm" to={productsPath({ type: add.type, view: 'all' })}>
          See them in All
        </Link>
      )}
    </section>
  );
}

/** The batches of the single-services path: a bar while one goes, then what each batch did. */
function SinglesRun({ add }: { add: AddState }) {
  const { importer, failure, ids } = add.singles;
  const outcomes = [...importer.earlier, ...importer.answers];
  const run = importer.progressFor(ids);
  const going = importer.isPending && run !== null && run.upTo !== null;
  if (outcomes.length === 0 && !going) return failure ? <Failure>{failure.text}</Failure> : null;
  const total = sentOf(importer.earlier) + Math.max(sentOf(importer.answers), run?.total ?? 0);
  return (
    <section aria-label={going ? 'Progress' : 'Result'} className="space-y-3">
      <SectionHeading>{going ? 'Progress' : 'Result'}</SectionHeading>
      {failure && <Failure>{failure.text}</Failure>}
      {going && (
        <div className="space-y-2">
          <Meter ratio={run.total > 0 ? run.handled / run.total : 0} tone="neutral" label="Adding services" />
          <p className="text-sm text-ink2" aria-live="polite">
            Adding {num(run.upTo ?? 0)} of {num(run.total)}…
          </p>
        </div>
      )}
      {outcomes.length > 0 && (
        <SinglesResultList
          outcomes={outcomes}
          total={total}
          onRetry={(line) => void importer.retryShop(line)}
          retrying={importer.retrying}
        />
      )}
      {outcomes.some((outcome) => outcome.result.created > 0) && (
        <Link className="link text-sm" to={productsPath({ type: add.type, view: 'all' })}>
          See them in All
        </Link>
      )}
    </section>
  );
}

/** The area under the rows: the run of the way in that is on screen. */
export function RunSection({ add }: { add: AddState }) {
  return add.way === 'groups' ? <GroupsRun add={add} /> : <SinglesRun add={add} />;
}
