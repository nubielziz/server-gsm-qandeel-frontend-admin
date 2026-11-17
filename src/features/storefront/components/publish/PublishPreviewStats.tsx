// PublishPreviewStats: the figures of a draft (how many services, how many are ready, need a look, cannot be published and will be
// published) and, when some rows wait for a pricing rule, the warning that says so with the way to the Retail pricing tab. The
// figures are the run's own counts; nothing is added up here.
import { Link } from 'react-router';
import { StatGrid } from '@/components/ui';
import { num } from '@/lib/format';
import { storefrontPricingPath } from '../../lib/paths';
import { servicesText } from '../../lib/publish';
import type { PublishRun } from '../../types';

/** The stat grid, flat inside the panel, and the no-rule note. */
export function PublishPreviewStats({ run }: { run: PublishRun }) {
  const { ready, review, blocked, included, noRule } = run.counts;
  return (
    <>
      <StatGrid
        label="Preview figures"
        className="!mb-0 !rounded-none !border-0"
        cells={[
          { label: 'Services', value: num(run.total) },
          { label: 'Ready', value: num(ready) },
          {
            label: 'Needs a look',
            value: num(review),
            tip: 'Publishable, but a person should look first. They are not ticked.',
          },
          {
            label: 'Cannot publish',
            value: num(blocked),
            tip: 'Something stops these now. The row says what.',
          },
          { label: 'Will be published', value: num(included) },
        ]}
      />
      {noRule > 0 && (
        <p className="m-3.5 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="status">
          {servicesText(noRule)} {noRule === 1 ? 'has' : 'have'} no price because no pricing rule covers{' '}
          {noRule === 1 ? 'it' : 'them'}.{' '}
          <Link className="link" to={storefrontPricingPath()}>
            Make a rule on the Retail pricing tab
          </Link>
          , then press Check again.
        </p>
      )}
    </>
  );
}
