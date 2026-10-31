// LimitsNote: the limits the server applied, as the muted line under a figure that is off. Data stores tab.
import { Fragment } from 'react';

export interface LimitsNoteProps {
  /** The text `thresholdText` makes: "warn 50 ms · crit 500 ms". */
  text: string;
}

/**
 * Prints the limits without a state word (the badge beside the number has it). Each limit stays in one piece with the dot
 * after it, so a narrow card wraps after a dot and no line starts with one.
 */
export function LimitsNote({ text }: LimitsNoteProps) {
  const limits = text.split(' · ');
  return (
    <>
      {limits.map((limit, i) => (
        <Fragment key={limit}>
          {i > 0 && ' '}
          <span className="whitespace-nowrap">{i < limits.length - 1 ? `${limit} ·` : limit}</span>
        </Fragment>
      ))}
    </>
  );
}
