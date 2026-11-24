// RankForm: the label-left form of a rank, shared by +Add Rank and Edit rank: name, kind (read only), discount, deposit limit, credit, "new merchants
// start here" and, when editing, how many accounts are in the rank. It ends in the pinned bar with one primary button. The server's message
// about a field lands under that field; any other goes beside the button. Ports the group dialog (`CRUD /admin/client-groups`).
import { useId, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  dialogSubmit,
  FormRow,
  PartForm,
  ReadValue,
  SectionHeading,
  TextField,
  UnsavedGuard,
  YesNo,
} from '@/components/ui';
import { isMerchantRank } from '../../lib/ranks';
import type { Rank } from '../../types';
import type { GrantLock } from '../frame/useAccountGrants';
import {
  depositProblem,
  nameProblem,
  percentProblem,
  RANK_FIELDS,
  RANK_NAME_MAX,
  type RankValues,
} from './rankForm';
import { RankAccountsRow } from './RankAccountsRow';
import { kindWord } from './rankList';

export interface RankFormProps {
  /** The heading above the rows: "Add Rank" or "Edit Wholesale". */
  heading: string;
  /** The words on the button: "Add" or "Save". */
  submitLabel: 'Add' | 'Save';
  /** What the form starts with: nothing for a new rank, the rank's own values when it edits one. */
  initial: RankValues;
  /** Keeps every row and the button off for a role that may not save, and says why beside the button. */
  lock: GrantLock;
  /**
   * The rank being edited: it gives the kind, the line about its accounts and the rows it has. Leave out when adding: a new rank is a
   * merchant rank. The retail rank has no discount, no credit and no default mark.
   */
  rank?: Rank;
  /**
   * Saves the values. It may throw (an ApiError is placed on its fields). Resolve with the values the form should show from now on (what the
   * server saved) to start from them; resolve with nothing to leave the form as it is; resolve with null when there was nothing to save, which
   * puts the form back to what it started with.
   */
  onSubmit: (values: RankValues) => Promise<RankValues | null | void>;
}

// The control of a row that is not a kit field: it points at the row's hint and error, and draws the red border when invalid.
const INVALID = 'aria-[invalid=true]:border-crit-dot';
const UNIT = 'text-sm italic text-ink3';

/** The form is the `view-frame`, so a short form still ends with its pinned bar at the foot of the window. */
export function RankForm({ heading, submitLabel, initial, lock, rank, onSubmit }: RankFormProps) {
  const base = useId();
  const ids = {
    discount: `${base}-discount`,
    deposit: `${base}-deposit`,
    credit: `${base}-credit`,
    start: `${base}-start`,
  };
  const form = useForm<RankValues>({ defaultValues: initial });
  const { register, control, formState } = form;
  const { errors, isDirty } = formState;
  // What the form shows when it is put back: what it started with, then what the server last saved.
  const baseline = useRef(initial);
  const adding = rank === undefined;
  const merchant = adding || isMerchantRank(rank);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const saved = await onSubmit(values);
      if (saved === null) {
        form.reset(baseline.current);
        return false;
      }
      if (saved) {
        baseline.current = saved;
        form.reset(saved);
      }
    },
    { fields: RANK_FIELDS },
  );

  const wired = (id: string, hint: boolean, error: boolean) => ({
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined,
  });

  return (
    <>
      <PartForm
        label={heading}
        submitLabel={submitLabel}
        onSubmit={submit}
        dirty={adding || isDirty}
        lock={lock}
      >
        <SectionHeading>{heading}</SectionHeading>
        <fieldset disabled={lock.disabled} className="m-0 min-w-0 border-0 p-0">
          <TextField
            layout="row"
            label="Rank name"
            required
            autoComplete="off"
            maxLength={RANK_NAME_MAX}
            error={errors.name}
            {...register('name', { validate: nameProblem })}
          />
          <FormRow label="Kind">
            <ReadValue>{rank ? kindWord(rank) : 'Merchant'}</ReadValue>
          </FormRow>
          {merchant && (
            <FormRow
              label="Discount"
              htmlFor={ids.discount}
              hint="Off base prices."
              error={errors.discountPercent?.message}
            >
              <div className="flex items-center gap-2">
                <input
                  id={ids.discount}
                  className={`input w-28 ${INVALID}`}
                  inputMode="decimal"
                  autoComplete="off"
                  {...wired(ids.discount, true, Boolean(errors.discountPercent))}
                  {...register('discountPercent', { validate: percentProblem })}
                />
                <span className={UNIT}>%</span>
              </div>
            </FormRow>
          )}
          <FormRow
            label="Deposit limit"
            htmlFor={ids.deposit}
            hint="Most an account of this rank may add at once."
            error={errors.depositLimit?.message}
          >
            <div className="flex items-center gap-2">
              <input
                id={ids.deposit}
                className={`input w-36 ${INVALID}`}
                inputMode="decimal"
                autoComplete="off"
                {...wired(ids.deposit, true, Boolean(errors.depositLimit))}
                {...register('depositLimit', { validate: depositProblem })}
              />
              <span className={UNIT}>USD</span>
            </div>
          </FormRow>
          <FormRow
            label="Credit"
            htmlFor={ids.credit}
            hint={
              merchant
                ? 'Accounts of this rank can have a credit limit.'
                : 'The retail rank never allows credit.'
            }
            error={errors.overdraftAllowed?.message}
          >
            <Controller
              control={control}
              name="overdraftAllowed"
              render={({ field }) => (
                <YesNo
                  id={ids.credit}
                  value={merchant && field.value}
                  onChange={field.onChange}
                  disabled={!merchant}
                  title={merchant ? undefined : 'The retail rank never allows credit'}
                />
              )}
            />
          </FormRow>
          {merchant && (
            <FormRow
              label="New merchants start here"
              htmlFor={ids.start}
              hint="Preselected when the Owner adds a merchant."
              error={errors.isDefault?.message}
            >
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => <YesNo id={ids.start} value={field.value} onChange={field.onChange} />}
              />
            </FormRow>
          )}
          {rank && <RankAccountsRow rank={rank} />}
        </fieldset>
      </PartForm>
      <UnsavedGuard active={isDirty} what={adding ? 'the new rank' : rank.name} />
    </>
  );
}
