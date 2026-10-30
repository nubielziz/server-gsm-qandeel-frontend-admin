// RuleRow: one rule of the Rules tab: its name and hint, the number behind it (when it has one) and the on/off switch. Ports a
// row of `tabRules` in 54-p-risk.js. A switch saves at once; a number saves when the field is left or Enter is pressed. The
// client only hints (a whole number, hold line below block line); the server's message for the field shows in the same place.
import { useState } from 'react';
import { Switch } from '@/components/ui';
import { parseRuleValue, ruleText, ruleValueHint } from '../lib/rules';
import type { RiskRule } from '../types';

export interface RuleRowProps {
  rule: RiskRule;
  /** Every rule, to hint that the hold line stays below the block line. */
  rules: readonly RiskRule[];
  /** Disables the controls: no permission (with its reason as `title`) or a save in progress. */
  lock: { disabled: boolean; title?: string };
  /** The server's message for this rule's field, from the last failed save. */
  serverError?: string;
  onToggle: (on: boolean) => void;
  onValue: (value: number) => void;
}

export function RuleRow({ rule, rules, lock, serverError, onToggle, onValue }: RuleRowProps) {
  const text = ruleText(rule);
  const shown = rule.value === null ? '' : String(rule.value);
  const [draft, setDraft] = useState(shown);
  const [seen, setSeen] = useState(shown);
  const [hint, setHint] = useState<string | null>(null);
  // The saved number changed under the field (a save came back, another tab): show it again.
  if (shown !== seen) {
    setSeen(shown);
    setDraft(shown);
  }

  function commit() {
    // A save is running (or the field is locked): its blur or Enter must not send the same number again.
    if (lock.disabled) return;
    if (draft.trim() === shown) {
      setHint(null);
      return;
    }
    const message = ruleValueHint(rules, rule.id, draft);
    setHint(message);
    const value = parseRuleValue(draft);
    if (!message && value !== null) onValue(value);
  }

  const error = hint ?? serverError;
  const errorId = `rule-${rule.id}-error`;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-medium">
          {text.label}
          {text.sameAsSettings && (
            <>
              {' '}
              <span className="tag">Same as Settings</span>
            </>
          )}
        </p>
        <p className="text-xs text-ink3">{text.hint}</p>
      </div>
      {rule.value !== null && (
        <div className="flex items-center gap-2 text-sm">
          <input
            aria-label={`Value for ${text.label}`}
            className="input w-20 text-end tabular-nums aria-[invalid=true]:border-crit-dot"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft}
            disabled={lock.disabled || !rule.on}
            title={lock.title}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setHint(null);
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
            }}
          />
          <span className="text-ink3">{text.unit}</span>
        </div>
      )}
      <Switch
        checked={rule.on}
        label={`${rule.on ? 'Turn off' : 'Turn on'}: ${text.label}`}
        disabled={lock.disabled}
        title={lock.title}
        onChange={onToggle}
      />
      {error && (
        <p id={errorId} className="basis-full text-xs text-crit-fg" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
