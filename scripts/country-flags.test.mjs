// Checks that the console has a flag picture for every country it lists: `public/flags/<code>.svg` for each code of
// `src/lib/isoCountries.ts` (decision 040). Flag (src/components/ui/Flag.tsx) draws a globe for a missing file, so a gap would not
// break a page; this test is what notices it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/lib/isoCountries.ts'), 'utf8');
const codes = /'((?:[A-Z]{2} )+[A-Z]{2})'/.exec(source)?.[1].split(' ') ?? [];

describe('country flags', () => {
  it('reads the 249 country codes of the console', () => {
    expect(codes).toHaveLength(249);
  });

  it('has a flag file for every country', () => {
    const missing = codes.filter(
      (code) => !existsSync(resolve(root, 'public/flags', `${code.toLowerCase()}.svg`)),
    );
    expect(missing).toEqual([]);
  });
});
