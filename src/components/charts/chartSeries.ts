// Series definitions of the charts. Ports SERIES of 30-charts.js: fixed order, never cycled, never used for status.

/** Name of a colour token (without the leading dashes): the SVG reads it as rgb(var(--name)), so dark mode needs no redraw. */
export type ChartColor =
  | 's1'
  | 's2'
  | 's3'
  | 's4'
  | 'accent'
  | 'ink3'
  | 'good-dot'
  | 'warn-dot'
  | 'serious-dot'
  | 'crit-dot'
  | 'neutral-dot';

export interface SeriesDef {
  /** Key of the value in each row. */
  key: string;
  label: string;
  color: ChartColor;
}

/** The four service types: IMEI blue, Server orange, Remote green, File amber (--s1..--s4). */
export const SERIES: readonly SeriesDef[] = [
  { key: 'IMEI', label: 'IMEI', color: 's1' },
  { key: 'Server', label: 'Server', color: 's2' },
  { key: 'Remote', label: 'Remote', color: 's3' },
  { key: 'File', label: 'File', color: 's4' },
];

/** One bar group of a stacked chart: a label ("12 Oct") and the value of every series. */
export interface StackedRow {
  label: string;
  values: Readonly<Record<string, number>>;
}

export const colorVar = (color: ChartColor): string => `rgb(var(--${color}))`;
