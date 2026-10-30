// Small text helpers for decimals the API sends as strings ("0.7900", "20.0000"). They only format and test the text; nothing here
// does maths that decides anything.

/** "0.7900" is "0.79", "1.0000" is "1", "20.5000" is "20.5". A text without a point is returned as it is. */
export function trimDecimal(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}

/** Whether a decimal string is zero ("0", "0.0000"). A missing value counts as zero. */
export function isZero(value: string | null | undefined): boolean {
  return value === null || value === undefined || /^[+-]?0*(\.0*)?$/.test(value.trim());
}

/** Whether a text is a plain non-negative decimal such as "12" or "0.79". */
export function isDecimalText(text: string): boolean {
  return /^\d+(\.\d+)?$/.test(text.trim());
}

/** Whether two decimal texts are the same number written differently ("2.9" and "2.9000"), by text so no maths is involved. */
export function sameDecimal(a: string, b: string): boolean {
  return trimDecimal(a.trim()) === trimDecimal(b.trim());
}
