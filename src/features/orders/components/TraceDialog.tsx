// TraceDialog: "How was this priced?" for one order, from the order's own `pricingSnapshot`. The demo's `trace` action sent the
// operator to the Services page's price resolver (today's rules); the console shows what was decided at order time
// instead (MISMATCHES M29). Drawn like the resolver's step list.
import { Icon, KeyValue, Modal, type IconName } from '@/components/ui';
import { money } from '@/lib/format';
import { PRICE_SOURCE_LABEL, pricingTrace, stepValueText, type StepState } from '../lib/trace';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';

// The icon, colour and word of each step state, as the demo's resolver had them.
const STEP: Record<StepState, { icon: IconName; tone: string; word: string }> = {
  win: { icon: 'checkCircle', tone: 'text-good-fg', word: 'Used' },
  apply: { icon: 'checkCircle', tone: 'text-good-fg', word: 'Applied' },
  skip: { icon: 'ban', tone: 'text-ink3', word: 'Skipped' },
  none: { icon: 'more', tone: 'text-ink3', word: 'Not set' },
};

export function TraceDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const trace = pricingTrace(order.pricingSnapshot);
  const source = trace.source ? (PRICE_SOURCE_LABEL[trace.source] ?? trace.source) : null;

  return (
    <Modal
      open
      size="lg"
      title={`How ${orderLabel(order)} was priced`}
      sub={source ? `Source: ${source}. The price is what was decided when the order was placed.` : undefined}
      onClose={onClose}
    >
      {trace.steps.length === 0 ? (
        trace.extras.length > 0 ? (
          <KeyValue rows={trace.extras.map(([label, value]) => [label, value] as const)} />
        ) : (
          <p className="text-sm text-ink2">No pricing details were saved with this order.</p>
        )
      ) : (
        <ol className="m-0 list-none divide-y divide-line border-y border-line p-0">
          {trace.steps.map((step, index) => {
            const { icon, tone, word } = STEP[step.state];
            const live = step.state === 'win' || step.state === 'apply';
            return (
              <li key={step.id} className={`flex items-start gap-3 px-3.5 py-2.5 ${live ? 'bg-sunken' : ''}`}>
                <span className="mono mt-0.5 w-4 flex-none text-ink3">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className={`text-sm ${live ? 'font-semibold' : 'font-medium text-ink3'}`}>
                      {step.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs ${tone}`}>
                      <Icon name={icon} className="ic-xs" />
                      {word}
                    </span>
                  </div>
                  {step.note && <p className="text-xs text-ink3">{step.note}</p>}
                </div>
                <div className="text-end tabular-nums">
                  <p className={`text-sm ${live ? 'font-semibold' : 'font-medium'}`}>{stepValueText(step)}</p>
                  {live && step.after !== null && step.value !== step.after && (
                    <p className="text-xs text-ink3">= {money(step.after)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {trace.floor !== null && (
        <p className="mt-3 text-xs text-ink3">
          Floor {money(trace.floor)}: cost plus the minimum profit.{' '}
          {trace.clamped ? 'The price was raised to the floor.' : 'The price was above the floor.'}
        </p>
      )}
    </Modal>
  );
}
