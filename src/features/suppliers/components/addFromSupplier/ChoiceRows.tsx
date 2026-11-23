// ChoiceRows: the three choices at the foot of the Add-from-supplier form, in label-left rows: Service Listed In Group, Status and Put on the
// shop. Each keeps its lock and the reason beside it. While an import waits to be continued the three stay as they were.
import { useId } from 'react';
import { Link } from 'react-router';
import { FormRow, ReadValue, SelectField, YesNo } from '@/components/ui';
import { productsPath } from '@/features/services';
import { storefrontPricingPath } from '@/features/storefront';
import { SHOP_SWITCH_HINT } from '../../lib/quickAddFlow';
import type { AddState } from './hooks/useAddFromSupplier';
import { GROUPS_LISTED_WORDS, SAME_AS_SUPPLIER, SINGLES_SHOP_HINT } from './lib/addRules';

/** Why a choice cannot change now. */
const LOCKED_TITLE = 'Fixed until the run that stopped is finished. Press Add to continue it.';

/** Service Listed In Group: fixed words for whole groups, a menu of our groups of the kind for single services. */
export function ListedRow({ add }: { add: AddState }) {
  const id = useId();
  if (add.way === 'groups') {
    return (
      <FormRow label="Service Listed In Group" hint="A group that does not exist yet is created.">
        <ReadValue>{GROUPS_LISTED_WORDS}</ReadValue>
      </FormRow>
    );
  }
  const error = add.singles.failure?.fields.categoryId;
  const lock = add.categoriesLock.disabled
    ? add.categoriesLock
    : { disabled: add.locked, title: LOCKED_TITLE };
  return (
    <FormRow label="Service Listed In Group" htmlFor={id} error={error}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <SelectField
          id={id}
          selectWrapClassName="w-full max-w-md"
          value={add.categoryId ?? ''}
          disabled={lock.disabled}
          title={lock.title}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          options={[
            { value: '', label: SAME_AS_SUPPLIER },
            ...(add.categories.data ?? []).map((category) => ({
              value: category.id,
              label: category.isActive ? category.name : `${category.name} (hidden)`,
            })),
          ]}
          onChange={(event) =>
            add.setCategoryId(event.target.value === '' ? null : Number(event.target.value))
          }
        />
        <Link className="link text-sm" to={productsPath({ type: add.type, view: 'add-group' })}>
          Add New Group
        </Link>
      </div>
    </FormRow>
  );
}

/** Status: Active or Inactive. Inactive services are created switched off. */
export function StatusRow({ add }: { add: AddState }) {
  const id = useId();
  return (
    <FormRow
      label="Status"
      htmlFor={id}
      error={add.singles.failure?.fields.status}
      hint={
        add.status === 'disabled'
          ? 'Inactive services are created switched off: merchants cannot order them until you switch them on.'
          : undefined
      }
    >
      <YesNo
        id={id}
        yes="Active"
        no="Inactive"
        value={add.status === 'active'}
        disabled={add.locked}
        title={add.locked ? LOCKED_TITLE : undefined}
        onChange={(on) => add.setStatus(on ? 'active' : 'disabled')}
      />
    </FormRow>
  );
}

/** Put on the shop: Yes or No, locked with the reason when no shop price rule is active, the role may not, or the services are Inactive. */
export function ShopRow({ add }: { add: AddState }) {
  const id = useId();
  const { on, lock, rule, setChoice } = add.shop;
  const hint = (
    <>
      <span className="block">{add.way === 'groups' ? SHOP_SWITCH_HINT : SINGLES_SHOP_HINT}</span>
      {lock !== undefined && (
        <span className="block text-ink2">
          {lock}
          {rule === 'none' && (
            <>
              {' '}
              <Link className="link" to={storefrontPricingPath()}>
                Open the shop price rules
              </Link>
            </>
          )}
        </span>
      )}
    </>
  );
  return (
    <FormRow label="Put on the shop" htmlFor={id} hint={hint}>
      <YesNo
        id={id}
        value={on}
        disabled={lock !== undefined || add.locked}
        title={lock ?? (add.locked ? LOCKED_TITLE : undefined)}
        onChange={setChoice}
      />
    </FormRow>
  );
}
