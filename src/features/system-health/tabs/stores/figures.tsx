// Builders of the figures a store card shows (Data stores tab): a measured number with the server's state, a plain fact,
// and a fact with no reading.
import { HealthBadge, MeasureValue } from '../../components';
import { NO_DATA, formatMeasure, thresholdText } from '../../lib';
import type { Measure } from '../../types';
import { LimitsNote } from './LimitsNote';
import { figureState, type Figure } from './storeFigures';

/**
 * A figure for a `Measure`. The value prints with its unit. When the server says the number is off (warn, critical, or
 * unknown with a reading), a badge beside it names the state (icon, word and tone, as the usage meters do) and a muted
 * line under it prints the limits the server applied. A missing value prints "No data" with no badge, because there is
 * nothing to judge, and the card sorts it as `unknown` (see `figureState`).
 */
export function measureFigure(key: string, label: string, measure: Measure): Figure {
  const off = measure.value !== null && measure.state !== 'ok';
  const limits = off ? thresholdText(measure, { both: true }) : null;
  return {
    key,
    label,
    state: figureState(measure),
    value: off ? (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="whitespace-nowrap">{formatMeasure(measure)}</span>
        <HealthBadge status={measure.state} />
      </span>
    ) : (
      <MeasureValue measure={measure} />
    ),
    note: limits ? <LimitsNote text={limits} /> : undefined,
  };
}

/** A fact the server sends no state for (a count, the size). It sorts as fine and prints as it came. */
export function plainFigure(
  key: string,
  label: string,
  value: Figure['value'],
  note?: Figure['note'],
): Figure {
  return { key, label, state: null, value, note };
}

/**
 * A fact that has no reading ("Locks waiting" from a database that cannot be asked). It prints "No data" in neutral, never
 * a zero, and sorts as `unknown` like the other readings that are missing, so it is looked at and never counted as fine.
 */
export function noDataFigure(key: string, label: string): Figure {
  return { key, label, state: 'unknown', value: <span className="text-ink3">{NO_DATA}</span> };
}
