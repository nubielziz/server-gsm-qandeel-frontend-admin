// FunnelSteps: the funnel as a list of steps with a count, the share of the step before and a bar. The markup and classes of the
// funnel in storefrontPanel() (40-p-dashboard.js); the steps come from `lib/funnel.ts`.
import { num } from '@/lib/format';
import type { FunnelStep } from '../lib/funnel';

export function FunnelSteps({ steps, label }: { steps: readonly FunnelStep[]; label: string }) {
  return (
    <ol className="m-0 list-none space-y-2.5 p-0" aria-label={label}>
      {steps.map((step) => (
        <li key={step.label}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="text-ink2">{step.label}</span>
            <span className="tabular-nums">
              <strong className="font-semibold">{num(step.count)}</strong>
              {step.share && <span className="text-xs text-ink3"> {step.share}</span>}
            </span>
          </div>
          <div className="meter mt-1 w-full">
            <i style={{ width: `${step.width}%`, background: 'rgb(var(--s2))' }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
