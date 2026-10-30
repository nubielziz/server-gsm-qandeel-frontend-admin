// The risk rules as a cached read, and saving one change at a time. Ports `rk-rule` and `rk-val` of 54-p-risk.js: each switch
// or number saves at once, as the demo did. `PUT` replaces the whole set, so a save sends every rule with the one change.
import { useQueryClient } from '@tanstack/react-query';
import { errorToast, useApiMutation, useApiQuery } from '@/lib/query';
import { getRiskRules, saveRiskRules } from '../api';
import { applyChange, rulesBody, ruleText, type RuleChange } from '../lib/rules';
import type { RiskRule, RiskRules } from '../types';
import { RISK_RULES_KEY } from './keys';

/** `data.rules` are the rules in the order the server sends them. */
export function useRiskRules() {
  return useApiQuery({
    queryKey: RISK_RULES_KEY,
    queryFn: ({ signal }) => getRiskRules({ signal }),
  });
}

/** What a save needs: the rules as shown now, and the change. */
export type SaveRuleInput = { rules: readonly RiskRule[]; change: RuleChange };

// The toast of the demo: "Rule on" / "Rule off" with the rule's name; a number change names the new number (the demo said nothing).
function savedToast(rule: RiskRule, change: RuleChange) {
  const text = ruleText(rule);
  if (change.on !== undefined)
    return { message: change.on ? 'Rule on' : 'Rule off', description: text.label };
  return {
    message: 'Rule updated',
    description: `${text.label}: ${change.value}${text.unit ? ` ${text.unit}` : ''}`,
  };
}

/**
 * Saves one change. A message the server puts on a field is shown under that rule by the page, so no error toast then; any
 * other failure (permission, network) is toasted as usual.
 */
export function useSaveRiskRule() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: ({ rules, change }: SaveRuleInput) => saveRiskRules(rulesBody(rules, change)),
    successNotification: (saved, { rules, change }) => {
      const after = applyChange(saved?.rules ?? rules, change).find((rule) => rule.id === change.id);
      return after ? savedToast(after, change) : false;
    },
    // The answer is the saved set; show it at once instead of waiting for another read. An empty answer falls back to the change.
    onSuccess: (saved, { rules, change }) => {
      const next: RiskRules = saved?.rules ? saved : { rules: applyChange(rules, change) };
      queryClient.setQueryData(RISK_RULES_KEY, next);
    },
    errorNotification: (error) => (Object.keys(error.fieldErrors).length > 0 ? false : errorToast(error)),
  });
}
