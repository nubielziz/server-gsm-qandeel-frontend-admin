// The mock server's quantity rule (feature 25): the same checks and messages as backend §2.2. A service sells a range or fixed
// packs; with packs the smallest and largest pack are stored as `minQty` and `maxQty`. The mock plays the server, so it refuses
// what the real one refuses.

const LIMIT = 100_000;
const MAX_PACKS = 50;

/** The three stored values. */
export type MockQuantity = { minQty: number; maxQty: number; qtyOptions: number[] };
type Problems = { field: string; message: string }[];

/** A sent `minQty` or `maxQty`: a whole number from 1 to 100000, or the problem with it. */
function limitOf(value: unknown): { value: number } | { message: string } {
  if (typeof value !== 'number' || !Number.isInteger(value)) return { message: 'Enter a whole number.' };
  if (value < 1) return { message: 'Enter 1 or more.' };
  if (value > LIMIT) return { message: `Use at most ${LIMIT}.` };
  return { value };
}

/** The pack sizes sent, ascending, or the first problem found (one field, `qtyOptions`). */
function packsOf(value: unknown): { packs: number[] } | { message: string } {
  if (!Array.isArray(value)) return { message: 'Send the pack sizes as a list.' };
  if (value.length > MAX_PACKS) return { message: `Use at most ${MAX_PACKS} pack sizes.` };
  const packs: number[] = [];
  for (const pack of value) {
    if (typeof pack !== 'number' || !Number.isInteger(pack) || pack < 1 || pack > LIMIT) {
      return { message: `Pack sizes are whole numbers from 1 to ${LIMIT}; ${String(pack)} is not.` };
    }
    if (packs.includes(pack)) return { message: `The pack size ${pack} is repeated.` };
    packs.push(pack);
  }
  return { packs: packs.sort((a, b) => a - b) };
}

/** Applies the quantity keys of a body to a service's rule; problems are pushed and the old rule is kept when there are any. */
export function applyQuantity(current: MockQuantity, body: Record<string, unknown>, problems: Problems) {
  if (!('minQty' in body || 'maxQty' in body || 'qtyOptions' in body)) return current;
  const before = problems.length;
  let packs = current.qtyOptions;
  if ('qtyOptions' in body) {
    const parsed = packsOf(body.qtyOptions);
    if ('message' in parsed) problems.push({ field: 'qtyOptions', message: parsed.message });
    else packs = parsed.packs;
  }
  const sent: { minQty?: number; maxQty?: number } = {};
  for (const field of ['minQty', 'maxQty'] as const) {
    if (!(field in body)) continue;
    const parsed = limitOf(body[field]);
    if ('message' in parsed) problems.push({ field, message: parsed.message });
    else sent[field] = parsed.value;
  }
  if (problems.length > before) return current;

  if (packs.length > 0) {
    const min = packs[0] ?? 1;
    const max = packs[packs.length - 1] ?? 1;
    for (const [field, word, expected] of [
      ['minQty', 'smallest', min],
      ['maxQty', 'largest', max],
    ] as const) {
      if (sent[field] !== undefined && sent[field] !== expected) {
        problems.push({
          field,
          message: `This service sells fixed packs, so its ${word} quantity is the ${word} pack (${expected}). Clear the packs to set a range.`,
        });
      }
    }
    return problems.length > before ? current : { minQty: min, maxQty: max, qtyOptions: packs };
  }
  const min = sent.minQty ?? current.minQty;
  const max = sent.maxQty ?? current.maxQty;
  if (max < min) {
    problems.push(
      sent.maxQty !== undefined
        ? { field: 'maxQty', message: `The largest quantity cannot be below the smallest (${min}).` }
        : { field: 'minQty', message: `The smallest quantity cannot be above the largest (${max}).` },
    );
    return current;
  }
  return { minQty: min, maxQty: max, qtyOptions: [] };
}
