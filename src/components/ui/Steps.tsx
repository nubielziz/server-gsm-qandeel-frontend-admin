// Steps: the step line of a multi-step dialog (done, current, to do) with a polite announcement on each change.
import { useState } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface StepsProps {
  steps: readonly { id: string; label: string }[];
  /** The `id` of the current step. An id that is not in `steps` leaves every step to do. */
  current: string;
  className?: string;
}

type StepState = 'done' | 'current' | 'todo';

const MARK: Record<StepState, string> = {
  done: 'border-line2 bg-sunken text-ink2',
  current: 'border-ink bg-ink text-surface',
  todo: 'border-line2 bg-surface text-ink3',
};

const LABEL: Record<StepState, string> = {
  done: 'text-ink2',
  current: 'font-semibold text-ink',
  todo: 'text-ink3',
};

/**
 * An ordered list. The current step has aria-current="step"; steps before it show a check mark and say "Done" to
 * screen readers, so the state never rests on colour alone. A hidden polite live region says "Step 2 of 3: <label>"
 * each time `current` changes (not on the first render, when the dialog itself is being announced).
 */
export function Steps({ steps, current, className }: StepsProps) {
  const index = steps.findIndex((step) => step.id === current);
  const [spokenFor, setSpokenFor] = useState(current);
  const [announcement, setAnnouncement] = useState('');
  // Adjust while rendering, the React way to react to a prop change.
  if (current !== spokenFor) {
    setSpokenFor(current);
    setAnnouncement(index >= 0 ? `Step ${index + 1} of ${steps.length}: ${steps[index].label}` : '');
  }

  return (
    <div className={className}>
      <ol aria-label="Steps" className="flex flex-wrap items-center gap-y-1.5 text-sm">
        {steps.map((step, i) => {
          const state: StepState = i < index ? 'done' : i === index ? 'current' : 'todo';
          return (
            <li
              key={step.id}
              aria-current={state === 'current' ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              {i > 0 && <span aria-hidden="true" className="mx-2 h-px w-4 flex-none bg-line2 sm:w-8" />}
              <span
                aria-hidden="true"
                className={cx(
                  'grid size-5 flex-none place-items-center rounded-full border text-2xs font-semibold',
                  MARK[state],
                )}
              >
                {state === 'done' ? <Icon name="check" className="ic-xs" /> : i + 1}
              </span>
              <span className={LABEL[state]}>
                {state === 'done' && <span className="sr-only">Done: </span>}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
