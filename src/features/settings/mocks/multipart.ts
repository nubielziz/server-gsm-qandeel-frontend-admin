// Reads the part named `file` of a multipart request by hand. `request.formData()` cannot be used in the test environment: the
// browser's FormData and File (jsdom) are not the ones the request implementation knows, so they reach the mock as an empty part.
// The part's type and bytes come out here either way; only a real browser sends the bytes in full. (The same helper the storefront and
// support mocks keep for their uploads: each feature's mocks stay self-contained.)

/** The `file` part of a multipart request: its declared type and its bytes. `null` when there is none. */
export async function filePartOf(request: Request): Promise<{ type: string; bytes: Uint8Array } | null> {
  const boundary = /boundary=([^;]+)/i
    .exec(request.headers.get('content-type') ?? '')?.[1]
    ?.replace(/^"|"$/g, '');
  if (!boundary) return null;
  const bytes = new Uint8Array(await request.arrayBuffer());
  // latin1 maps one character to one byte, so an index in the text is an index in the bytes.
  const text = new TextDecoder('latin1').decode(bytes);
  for (const part of text.split(`--${boundary}`)) {
    const split = part.indexOf('\r\n\r\n');
    if (split < 0) continue;
    const head = part.slice(0, split);
    if (!/name="file"/i.test(head)) continue;
    const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim() ?? '';
    const start = text.indexOf(part) + split + 4;
    const end = text.indexOf(part) + part.length - (part.endsWith('\r\n') ? 2 : 0);
    return { type, bytes: bytes.slice(start, Math.max(start, end)) };
  }
  return null;
}
