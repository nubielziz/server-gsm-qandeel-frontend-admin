// The rules for a file on a reply or note (feature 28, plan §2 rule 8), checked before the upload so a wrong file is refused at once. The server checks
// again by content (PDF, JPEG or PNG, 1 byte to 5 MiB, at most 5 per message) and its answer is shown when it refuses.

/** What the file picker offers (the browser filter; a dragged or renamed file can still be wrong, so `refusalFor` checks too). */
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;

const TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const ALLOWED_TYPES = new Set(Object.values(TYPES_BY_EXTENSION));

/** True when the file is a PDF, JPEG or PNG by its declared type, or by its extension when the browser gave no type. */
export function isAllowedType(file: { name: string; type: string }): boolean {
  if (file.type !== '') return ALLOWED_TYPES.has(file.type);
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return Object.hasOwn(TYPES_BY_EXTENSION, extension);
}

/** "340 KB", "1.2 MB": a file size for a chip. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Why a file cannot be attached, or null when it can. `kept` is how many files the message already has (not counting refused ones). The wording is the
 * sentence the staff member reads on the file's chip.
 */
export function refusalFor(file: { name: string; type: string; size: number }, kept: number): string | null {
  if (kept >= MAX_ATTACHMENTS) return `A message can have ${MAX_ATTACHMENTS} files at most.`;
  if (!isAllowedType(file)) return 'Only PDF, JPEG and PNG files can be attached.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'This file is larger than 5 MB.';
  return null;
}
