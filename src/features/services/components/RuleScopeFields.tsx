// RuleScopeFields: the first fields of the pricing rule dialog: what the rule covers (every service, a category or one service), which
// one, whether it adds or takes from the price, and for which merchant group. The menus are controlled, so a rule being edited keeps its
// target and group chosen while the names load, and changing what the rule covers clears the target (a category id is not a service id).
import type { UseFormReturn } from 'react-hook-form';
import { SelectField } from '@/components/ui';
import { useCategories, useGroupOptions, useServiceChoices } from '../hooks/useChoices';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { KIND_OPTIONS, SCOPE_OPTIONS } from '../lib/rules';
import type { RuleValues } from '../lib/ruleForm';
import { withChosen } from '../lib/select';
import type { PricingRule } from '../types';
import { LookupNote } from './LookupNote';

export interface RuleScopeFieldsProps {
  form: UseFormReturn<RuleValues>;
  /** The rule being edited, whose joined names label the chosen target and group before the lists load. */
  rule?: PricingRule;
}

/** Covers, target, type and merchant group of a rule. */
export function RuleScopeFields({ form, rule }: RuleScopeFieldsProps) {
  const grants = useServiceGrants();
  const canCatalog = grants.can('catalog:read');
  const categories = useCategories(canCatalog);
  const services = useServiceChoices(canCatalog);
  const groups = useGroupOptions(grants.can('groups:read'));
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const scope = watch('scope');
  const targetId = watch('targetId');
  const groupId = watch('groupId');

  const targets = (scope === 'category' ? categories.categories : (services.data ?? [])).map((target) => ({
    value: target.id,
    label: target.name,
  }));
  const targetOptions = withChosen(
    [{ value: '', label: `Choose a ${scope}` }, ...targets],
    targetId,
    rule?.scope === scope && rule.target
      ? rule.target.name
      : `${scope === 'category' ? 'Category' : 'Service'} ${targetId}`,
  );
  const groupOptions = withChosen(
    [
      { value: '', label: 'All groups' },
      ...(groups.data ?? []).map((group) => ({ value: group.id, label: group.name })),
    ],
    groupId,
    rule?.group?.name ?? `Group ${groupId}`,
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Applies to"
          selectWrapClassName="w-full"
          options={SCOPE_OPTIONS}
          error={errors.scope}
          {...register('scope', { onChange: () => setValue('targetId', '') })}
        />
        {scope !== 'global' && (
          <div>
            <SelectField
              label={scope === 'category' ? 'Category' : 'Service'}
              selectWrapClassName="w-full"
              options={targetOptions}
              error={errors.targetId}
              {...register('targetId')}
              value={targetId}
            />
            <LookupNote
              what={scope === 'category' ? 'the categories' : 'the services'}
              query={scope === 'category' ? categories.query : services}
            />
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Type"
          selectWrapClassName="w-full"
          options={KIND_OPTIONS}
          error={errors.kind}
          {...register('kind')}
        />
        <div>
          <SelectField
            label="Merchant group"
            selectWrapClassName="w-full"
            options={groupOptions}
            error={errors.groupId}
            {...register('groupId')}
            value={groupId}
          />
          <LookupNote what="merchant groups" query={groups} />
        </div>
      </div>
    </>
  );
}
