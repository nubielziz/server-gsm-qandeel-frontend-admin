// PreviewFrame: shows the server's rendering of a template safely. Plain text is printed as text; HTML goes into an iframe with an empty
// `sandbox` (no scripts, no forms, no same-origin access) and a content policy, so nothing in a template can run on the console.
import { isHtmlPreview, previewDocument } from '../lib/templates';
import type { TemplatePreview } from '../types';

/** The body of a preview: text or a sandboxed frame. */
export function PreviewFrame({ preview }: { preview: Pick<TemplatePreview, 'body' | 'format'> }) {
  if (!isHtmlPreview(preview)) {
    return <p className="whitespace-pre-wrap px-3.5 py-3 text-sm text-ink2">{preview.body}</p>;
  }
  return (
    <iframe
      title="Message preview"
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={previewDocument(preview.body)}
      className="block h-72 w-full rounded-b-lg border-0 bg-white"
    />
  );
}
