// Reads the part named `file` of a multipart upload by hand: its file name, declared type and size. `request.formData()` cannot be used in the test environment: the
// browser's FormData and File (jsdom) are not the ones the request implementation knows, so the part arrives with the name "blob" and no bytes. A real browser
// (the dev mock worker) sends all three in full. Dev and tests only.

/** The `file` part of a multipart request. */
export type FilePart = { filename: string; type: string; size: number };

/** The header's text was read one byte per character (latin1); a name written as UTF-8 is put back together here. */
function utf8Name(latin1: string): string {
  return new TextDecoder().decode(Uint8Array.from(latin1, (char) => char.charCodeAt(0) & 0xff));
}

/** The `file` part of a multipart request, or null when there is none. */
export async function filePartOf(request: Request): Promise<FilePart | null> {
  const boundary = /boundary=([^;]+)/i
    .exec(request.headers.get('content-type') ?? '')?.[1]
    ?.replace(/^"|"$/g, '');
  if (!boundary) return null;
  const bytes = new Uint8Array(await request.arrayBuffer());
  // latin1 maps one character to one byte, so a length in the text is a length in the bytes.
  const text = new TextDecoder('latin1').decode(bytes);
  for (const part of text.split(`--${boundary}`)) {
    const split = part.indexOf('\r\n\r\n');
    if (split < 0) continue;
    const head = part.slice(0, split);
    if (!/name="file"/i.test(head)) continue;
    const filename = utf8Name(/filename="([^"]*)"/i.exec(head)?.[1] ?? 'file');
    const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim() ?? '';
    const size = part.length - split - 4 - (part.endsWith('\r\n') ? 2 : 0);
    return { filename, type, size: Math.max(0, size) };
  }
  return null;
}
