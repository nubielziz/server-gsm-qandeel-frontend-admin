// JsonBlock: a request or response body as indented text in a scrollable box, with a copy button. The server has already masked
// keys and passwords in the bodies, so they are printed as they come.
import { CopyButton } from '@/components/ui';
import type { JsonValue } from '@/lib/api';
import { prettyJson } from '../lib/logs';

export interface JsonBlockProps {
  /** "request" or "response": names the box and the copy button. */
  label: string;
  value: JsonValue;
}

export function JsonBlock({ label, value }: JsonBlockProps) {
  return (
    <div className="relative">
      <pre
        className="mono max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md border border-line bg-sunken p-3 text-xs"
        tabIndex={0}
        aria-label={`Call ${label}`}
      >
        {prettyJson(value)}
      </pre>
      <span className="absolute end-1.5 top-1.5">
        <CopyButton value={prettyJson(value)} label={label} />
      </span>
    </div>
  );
}
