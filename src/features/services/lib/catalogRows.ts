// What a page of Catalog rows says about the role: the server leaves out a key the session may not read (never `null` or `false`
// instead), so a key that no row carries means "not allowed" and the column, chip or action built on it is not shown.
import type { Service } from '../types';

/** Whether any row carries `key`. An empty page carries none. */
export function rowsCarry(rows: readonly Service[], key: keyof Service): boolean {
  return rows.some((row) => key in row);
}
