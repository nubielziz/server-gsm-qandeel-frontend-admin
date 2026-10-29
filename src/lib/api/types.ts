// Value types shared by every API call: ids, money, dates, JSON and the list query/result shapes.
// The API speaks camelCase JSON; money is a 4-decimal string, dates are ISO strings, ids are numbers.

/** Database id as the API sends it (a JSON number). */
export type Id = number;

/** Money as a decimal string with 4 fraction digits, e.g. "12.4900". Sums and balances come from the server. */
export type Money = string;

/** Any other exact decimal (rates, percents) sent as a string so no precision is lost. */
export type Decimal = string;

/** ISO 8601 date-time in UTC, e.g. "2026-03-01T09:30:00.000Z". */
export type IsoDateTime = string;

/** Any JSON value; used for free-form columns (`jsonb`) and request bodies we do not model. */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

/** One value of a field filter in a list query. */
export type FilterValue = string | number | boolean;

/**
 * A list request in the API's simple-rest dialect: a row range (`_start`/`_end`), sort fields with
 * their directions, a free-text `q`, and field filters (an array value repeats the key).
 */
export type ListQuery = {
  start?: number;
  end?: number;
  sort?: string[];
  order?: ('asc' | 'desc')[];
  q?: string;
  filters?: Record<string, FilterValue | FilterValue[] | undefined>;
};

/** One page of rows plus the total row count the server reported (`x-total-count`). */
export type ListResult<T> = { data: T[]; total: number };
