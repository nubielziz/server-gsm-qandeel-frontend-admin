// PublishStart: the start of the Publish view (no run in the address): what to publish and the note about prices, then the earlier runs, and
// in the pinned bar the one primary button that asks the server to prepare a preview. Nothing is published here: the preview is a draft the
// server keeps.
import { useId, useState, type FormEvent } from 'react';
import { Button, PinnedBar } from '@/components/ui';
import { useCreatePublishRun } from '../../hooks/usePublishMutations';
import { useCounts } from '../../hooks/useCounts';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { listRetailPriceRules } from '../../api';
import { ACTIVE_RULES_SPEC } from '../../lib/counts';
import { refusalText } from '../../lib/publish';
import type { PublishScope } from '../../types';
import { PricingSection } from '../pricing/PricingSection';
import { PublishHistory } from './PublishHistory';
import { PublishRuleNote } from './PublishRuleNote';
import { PublishScopeFields, type ScopeValues } from './PublishScopeFields';

export interface PublishStartProps {
  grants: StorefrontGrants;
  /** Goes to the run the server made. */
  onOpen: (runId: number) => void;
}

/** The scope the form stands for, or the sentence that says what is missing. */
function scopeOf(values: ScopeValues): PublishScope | string {
  if (values.kind === 'category')
    return values.categoryId
      ? { kind: 'category', categoryId: Number(values.categoryId) }
      : 'Choose a category.';
  if (values.kind === 'supplier')
    return values.supplierId
      ? { kind: 'supplier', supplierId: Number(values.supplierId) }
      : 'Choose a supplier.';
  return { kind: 'all' };
}

/** The choices, the price note and the history, then the pinned bar with the Prepare button (it submits the form above it). */
export function PublishStart({ grants, onOpen }: PublishStartProps) {
  const [values, setValues] = useState<ScopeValues>({ kind: 'all', categoryId: '', supplierId: '' });
  // `missing` is the form's own check (nothing picked), shown under the picker; `error` is the server's refusal, shown by the button.
  const [missing, setMissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePublishRun();
  const formId = useId();
  const lock = grants.needs('storefront:create');
  // Without pricing:read the plain line stays: the preview says the same, row by row.
  const rules = useCounts(
    'publish',
    listRetailPriceRules,
    [ACTIVE_RULES_SPEC],
    grants.ready && grants.can('pricing:read'),
  );
  const noRule = rules[ACTIVE_RULES_SPEC.id] === 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const scope = scopeOf(values);
    setError(null);
    if (typeof scope === 'string') return setMissing(scope);
    setMissing(null);
    create.mutate(
      { scope },
      { onSuccess: (run) => onOpen(run.id), onError: (e) => setError(refusalText(e)) },
    );
  };

  return (
    <div className="view-frame">
      <div className="grid gap-8">
        <PricingSection
          title="Publish services to the shop"
          sub="Choose which services to put on the shop. You review a preview first: nothing is on the shop until you confirm."
        >
          <form id={formId} className="space-y-3" onSubmit={submit} noValidate>
            <PublishScopeFields
              values={values}
              onChange={(next) => {
                setValues(next);
                setMissing(null);
                setError(null);
              }}
              grants={grants}
              error={missing ?? undefined}
            />
            <PublishRuleNote noRule={noRule} />
            {error && (
              <p className="text-sm text-crit-fg" role="alert">
                {error}
              </p>
            )}
          </form>
        </PricingSection>
        <PublishHistory grants={grants} />
      </div>
      <PinnedBar>
        <Button type="submit" form={formId} variant="primary" loading={create.isPending} {...lock}>
          Prepare the preview
        </Button>
      </PinnedBar>
    </div>
  );
}
