// CheckResultList: what the lookup returned, as label and value rows. The server's `result` is free-form, so every key is
// shown with its value as it is (nested values as JSON) and nothing is assumed about the supplier's answer.
import { KeyValue } from '@/components/ui';
import type { JsonObject, JsonValue } from '@/lib/api';

// "simLock" and "sim_lock" both read "Sim lock".
function keyText(key: string): string {
  const words = key
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function valueText(value: JsonValue): string {
  if (value === null) return '–';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function CheckResultList({ result }: { result: JsonObject | null }) {
  const entries = result ? Object.entries(result) : [];
  if (entries.length === 0) return null;
  return (
    <>
      <h3 className="mb-1.5 text-xs font-medium text-ink3">What the lookup returned</h3>
      <KeyValue
        rows={entries.map(([key, value]) => [
          keyText(key),
          <span key={key} className="mono">
            {valueText(value)}
          </span>,
        ])}
      />
    </>
  );
}
