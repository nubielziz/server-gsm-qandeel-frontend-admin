// PublishScopeFields: "What to publish" on the Publish tab's start: everything not on the shop yet, one category (found by search),
// or one supplier's services. A choice the role cannot use says which permission it needs. The other scopes (ticked services, a
// Quick add run) start from the screens that know them.
import { RadioGroup, type RadioOption } from '@/components/ui';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { PublishCategoryField } from './PublishCategoryField';
import { PublishSupplierField } from './PublishSupplierField';

/** The choices of the start. */
export type ScopeChoice = 'all' | 'category' | 'supplier';

/** What the start form holds: the choice and the picked category and supplier (ids as text, '' for none). */
export type ScopeValues = { kind: ScopeChoice; categoryId: string; supplierId: string };

export interface PublishScopeFieldsProps {
  values: ScopeValues;
  onChange: (values: ScopeValues) => void;
  grants: StorefrontGrants;
  /** The refusal under the picker of the chosen scope. */
  error?: string;
}

/** The radio group and, under it, the picker of the chosen scope. */
export function PublishScopeFields({ values, onChange, grants, error }: PublishScopeFieldsProps) {
  const categories = grants.needs('catalog:read');
  const suppliers = grants.needs('suppliers:read');
  const options: RadioOption[] = [
    { value: 'all', label: 'Everything not on the shop yet' },
    {
      value: 'category',
      label: 'A category',
      disabled: categories.disabled,
      description: categories.title,
    },
    {
      value: 'supplier',
      label: "A supplier's services",
      disabled: suppliers.disabled,
      description: suppliers.title,
    },
  ];
  return (
    <div className="space-y-3">
      <RadioGroup
        legend="What to publish"
        name="publish-scope"
        options={options}
        value={values.kind}
        onChange={(event) => onChange({ ...values, kind: event.target.value as ScopeChoice })}
      />
      {values.kind === 'category' && (
        <PublishCategoryField
          value={values.categoryId}
          onChange={(categoryId) => onChange({ ...values, categoryId })}
          error={error}
        />
      )}
      {values.kind === 'supplier' && (
        <PublishSupplierField
          value={values.supplierId}
          onChange={(supplierId) => onChange({ ...values, supplierId })}
          error={error}
        />
      )}
    </div>
  );
}
