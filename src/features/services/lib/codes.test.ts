// Tests for the import dialog's text: cutting pasted or uploaded text into one code per line, and reading a picked file.
import { describe, expect, it } from 'vitest';
import { codesText, readCodes } from './codes';
import { readTextFile } from './readFile';

describe('readCodes', () => {
  it('cuts the text into trimmed lines and drops blank ones', () => {
    expect(readCodes('  AAA-1  \n\nBBB-2\r\n \nCCC-3')).toEqual(['AAA-1', 'BBB-2', 'CCC-3']);
  });

  it('keeps repeated codes, because counting duplicates is the server’s job', () => {
    expect(readCodes('X1\nX1')).toEqual(['X1', 'X1']);
  });

  it('gives nothing for empty text', () => {
    expect(readCodes('')).toEqual([]);
    expect(readCodes(' \n ')).toEqual([]);
  });
});

describe('codesText', () => {
  it('counts codes', () => {
    expect(codesText(1)).toBe('1 code');
    expect(codesText(12)).toBe('12 codes');
  });
});

describe('readTextFile', () => {
  it('reads the text of a file', async () => {
    expect(await readTextFile(new File(['A\nB\n'], 'codes.txt', { type: 'text/plain' }))).toBe('A\nB\n');
  });
});
