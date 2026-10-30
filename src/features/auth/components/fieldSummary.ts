// fieldSummary: the sentence FormAlert reads out after a submit with field errors, naming the fields to fix.

/** "Email needs attention." or "2 fields need attention: Email, Password." */
export function fieldSummary(fields: readonly string[]): string {
  if (fields.length === 1) return `${fields[0]} needs attention.`;
  return `${fields.length} fields need attention: ${fields.join(', ')}.`;
}
