// Helpers for file downloads (CSV and other exports): the file name from the response and the save-as step.

/** Reads the file name from a Content-Disposition header (`filename*=UTF-8''…` wins over `filename="…"`). */
export function filenameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const encoded = /filename\*\s*=\s*(?:[\w-]+)?'[^']*'([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch {
      // Malformed escape: fall through to the plain filename.
    }
  }
  const plain = /filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]+))/i.exec(header);
  const name = (plain?.[1]?.replace(/\\(.)/g, '$1') ?? plain?.[2])?.trim();
  return name || undefined;
}

/** Saves a blob through a temporary link, which is how browsers start a download without navigating. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the browser has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
