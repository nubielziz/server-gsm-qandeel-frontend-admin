// In-memory table for the dev mock layer: rows with auto-assigned numeric ids, like a database table.
// State lives only as long as the page (or the test), which is all a mock needs.

type Row = { id: number };

/** A list of rows keyed by `id`. Rows are stored as given, so seed them already shaped like the API's DTOs. */
export class Collection<T extends Row> {
  private rows: T[];
  private nextId: number;

  constructor(rows: readonly T[] = []) {
    this.rows = [...rows];
    this.nextId = this.maxId() + 1;
  }

  private maxId(): number {
    return this.rows.reduce((max, row) => Math.max(max, row.id), 0);
  }

  /** All rows, in insertion order (a copy of the list; the rows themselves are shared). */
  list(): T[] {
    return [...this.rows];
  }

  get size(): number {
    return this.rows.length;
  }

  /** The row with this id. Accepts the string a URL parameter gives. */
  find(id: number | string): T | undefined {
    const wanted = Number(id);
    return this.rows.find((row) => row.id === wanted);
  }

  /** Adds a row; an explicit `id` is kept, otherwise the next free one is assigned. */
  insert(input: Omit<T, 'id'> & { id?: number }): T {
    const row = { ...input, id: input.id ?? this.nextId } as T;
    this.rows.push(row);
    this.nextId = Math.max(this.nextId, row.id + 1);
    return row;
  }

  /** Merges `changes` into the row (PATCH semantics) and returns it, or undefined when there is no such row. */
  patch(id: number | string, changes: Partial<T>): T | undefined {
    const row = this.find(id);
    if (!row) return undefined;
    Object.assign(row, changes, { id: row.id });
    return row;
  }

  /** Removes the row and returns it, or undefined when there is no such row. */
  remove(id: number | string): T | undefined {
    const row = this.find(id);
    if (row) this.rows = this.rows.filter((r) => r !== row);
    return row;
  }

  /** Replaces all rows (used to re-seed between tests). */
  reset(rows: readonly T[] = []): void {
    this.rows = [...rows];
    this.nextId = this.maxId() + 1;
  }
}
