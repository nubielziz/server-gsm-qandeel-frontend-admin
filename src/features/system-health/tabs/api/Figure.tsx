// Figure: one measured number in a right-aligned column of the API tab's tables (surfaces, slowest endpoints). It is the
// shared MeasureValue with the room of its state icon kept, so every figure of a column ends on the same line.
import { MeasureValue } from '../../components';
import type { Measure } from '../../types';

export interface FigureProps {
  /** Undefined when the server left the measure out: it reads "No data". */
  measure: Measure | undefined;
}

/** A measure the server left out reads "No data", like a null value, and keeps the same room. */
const MISSING: Measure = { value: null, unit: 'count', state: 'unknown' };

/** The figure, or "No data", aligned with its column. */
export function Figure({ measure }: FigureProps) {
  return <MeasureValue measure={measure ?? MISSING} reserveIcon />;
}
