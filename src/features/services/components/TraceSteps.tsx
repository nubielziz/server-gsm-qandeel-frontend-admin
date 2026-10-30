// TraceSteps: the left half of the resolver: the rule in one sentence and the numbered steps the server took, ending with the floor
// check. Ports the steps list of resolverTab in 43-p-services.js; the steps come from `GET /admin/pricing/resolve`.
import type { PriceResolution } from '../types';
import { FloorRow } from './FloorRow';
import { TraceStepRow } from './TraceStepRow';

/** The sentence and the numbered list of steps. */
export function TraceSteps({ resolution }: { resolution: PriceResolution }) {
  return (
    <div className="border-b border-line xl:border-b-0 xl:border-e">
      <p className="px-3.5 pt-3 text-xs text-ink3">
        First match wins: a client override, then a group service price. Otherwise the base price takes the
        category rule and then the group discount.
      </p>
      <ol
        className="m-0 mt-2 list-none divide-y divide-line border-t border-line p-0"
        aria-label="Resolution steps"
      >
        {resolution.steps.map((step, index) => (
          <TraceStepRow key={step.id} step={step} number={index + 1} />
        ))}
        <FloorRow resolution={resolution} number={resolution.steps.length + 1} />
      </ol>
    </div>
  );
}
