// StepHeading: the heading of the step on screen in the Add services flow, for people who cannot see the step line. When the step changes
// focus moves onto it, so the button that was pressed (and the one that takes its place) no longer holds the focus.
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A heading only screen readers see, the first thing in the body of a step. `step` names the step: when it changes the heading takes
 * the focus (Tab then goes to the first control of the new step), and what it says is read out. Why: the primary button of one step
 * sits where the next step's button will, so a held Enter or a second press must not land on it; with the focus on the heading it
 * cannot. The first render does not take the focus: the dialog's own rule for its opening applies.
 */
export function StepHeading({ step, children }: { step: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <h3 ref={heading} tabIndex={-1} className="sr-only">
      {children}
    </h3>
  );
}
