// RulesTab: the Rules tab: every rule with its switch and number, and the "How scoring works" panel. Ports `tabRules` of
// 54-p-risk.js. Each change is saved at once; the server's message for a field (for example the hold line not below the block
// line) shows under that rule. Changing rules needs `risk:*` (a hint only: the server decides).
import { useState } from 'react';
import { EmptyState, Panel, QueryState, SkeletonTable } from '@/components/ui';
import type { RiskGrants } from '../hooks/useRiskGrants';
import { useRiskRules, useSaveRiskRule } from '../hooks/useRiskRules';
import { RISK_PERMISSION } from '../lib/permissions';
import { ruleErrors, type RuleChange } from '../lib/rules';
import { RuleRow } from './RuleRow';
import { ScoringPanel } from './ScoringPanel';

type Problems = ReturnType<typeof ruleErrors>;
const NO_PROBLEMS: Problems = { byRule: {}, rest: [] };

export function RulesTab({ grants }: { grants: RiskGrants }) {
  const query = useRiskRules();
  const save = useSaveRiskRule();
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const rules = query.data?.rules ?? [];
  const permission = grants.needs(RISK_PERMISSION.rules);
  // One save at a time: a save replaces the whole set, so a second one must start from the first one's answer.
  const lock = { disabled: permission.disabled || save.isPending, title: permission.title };

  function change(next: RuleChange) {
    setProblems(NO_PROBLEMS);
    save.mutate({ rules, change: next }, { onError: (error) => setProblems(ruleErrors(error, rules)) });
  }

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      errorTitle="Could not load the rules"
      onRetry={() => void query.refetch()}
      isEmpty={rules.length === 0}
      empty={
        <Panel flush>
          <EmptyState icon="shield" title="No rules yet">
            The server sent no rules to show.
          </EmptyState>
        </Panel>
      }
      skeleton={
        <Panel flush>
          <SkeletonTable cols={3} rows={6} />
        </Panel>
      }
    >
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel
          title="Rules"
          sub="Each signal adds points to an order. Under the hold line it goes straight through, above it a person decides, above the block line it is refused."
          flush
        >
          {problems.rest.length > 0 && (
            <p className="border-b border-line px-3.5 py-2 text-sm text-crit-fg" role="alert">
              {problems.rest.join(' ')}
            </p>
          )}
          <ul className="m-0 list-none divide-y divide-line p-0">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                rules={rules}
                lock={lock}
                serverError={problems.byRule[rule.id]}
                onToggle={(on) => change({ id: rule.id, on })}
                onValue={(value) => change({ id: rule.id, value })}
              />
            ))}
          </ul>
        </Panel>
        <ScoringPanel rules={rules} />
      </div>
    </QueryState>
  );
}
