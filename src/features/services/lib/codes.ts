// Pasted or uploaded codes for the import dialog: one code per line. This only cuts the text into lines; the server finds the
// duplicates and the codes it cannot read, and says how many of each.

/** The codes in a block of text: one per line, trimmed, blank lines dropped. Duplicates are kept for the server to count. */
export function readCodes(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** "3 codes" / "1 code". */
export function codesText(count: number): string {
  return `${count} ${count === 1 ? 'code' : 'codes'}`;
}

/** The text files the upload accepts: plain text and CSV exports, one code per line. */
export const CODE_FILE_TYPES = '.txt,.csv,text/plain,text/csv';
