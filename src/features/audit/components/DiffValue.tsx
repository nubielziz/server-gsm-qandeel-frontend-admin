// DiffValue: one value of the before / after table, as text. Empty values show a dash; a list or an object shows as
// formatted JSON in a block that scrolls. Never HTML: React escapes the text.
import type { JsonValue } from '@/lib/api';
import { isStructured, valueJson, valueText } from '../lib/diff';

export function DiffValue({ value }: { value: JsonValue | undefined }) {
  if (isStructured(value)) {
    return (
      <pre className="mono max-h-40 max-w-[28rem] overflow-auto whitespace-pre rounded border border-line bg-sunken p-1.5 text-2xs">
        {valueJson(value as JsonValue)}
      </pre>
    );
  }
  const text = valueText(value);
  return text ? <span className="break-words">{text}</span> : <span className="text-ink3">—</span>;
}
