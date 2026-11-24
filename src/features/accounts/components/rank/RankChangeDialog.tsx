// RankChangeDialog: "Change the rank of <name>": the Owner moves an account to another rank. It replaces the old group menu. The dialog says
// what the change does before it is confirmed (prices only, or a wallet that moves, sessions that end, keys that are revoked), asks for it
// with one Idempotency-Key per opening (a retry cannot change the rank twice) and, when the server refuses, lists every blocker in words:
// nothing moved. The rules themselves, the sums and the Owner check are the server's.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, FormRow, ReadValue, SelectField, dialogSubmit } from '@/components/ui';
import { useAccountWallet } from '../../hooks/useAccountWallet';
import { useChangeRank } from '../../hooks/useAccountMutations';
import { useDialogKey } from '../../hooks/useDialogKey';
import { useRanks } from '../../hooks/useRanks';
import { rankBlockersOf } from '../../lib/rankChangeBlockers';
import { useAccountGrants } from '../frame/useAccountGrants';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import {
  currentRankText,
  rankChoiceLabel,
  rankChoices,
  rankConsequence,
  type WalletFigures,
} from './rankChangeWords';

type Values = { groupId: string };

/**
 * The rank change of one account.
 *
 * @param props the account and the close handler
 * Side effects: `POST /admin/clients/:id/rank { groupId }` with an `Idempotency-Key` made when the dialog opens; the record, the lists, the
 * wallet, the statement, the API keys and the counts go stale; a toast says what moved (the amount, the sessions ended, the keys revoked).
 * @throws nothing: a refusal (`RANK_CHANGE_BLOCKED` with every blocker, or another answer) stays in the dialog, which stays open.
 */
export function RankChangeDialog({ account, onClose }: AccountDialogProps) {
  const grants = useAccountGrants();
  const key = useDialogKey();
  const listLock = grants.needs('groups:read');
  const ownerLock = grants.ownerLock('Only the Owner changes a rank.');
  const { ranks, query } = useRanks(!listLock.disabled);
  const walletRead = useAccountWallet(account.id, grants.can('wallet:read'));
  const change = useChangeRank();
  const [blockers, setBlockers] = useState<string[]>([]);
  const form = useForm<Values>({ defaultValues: { groupId: '' } });
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const choices = rankChoices(ranks, account.rank.id);
  const target = choices.find((rank) => String(rank.id) === watch('groupId'));
  // The figures come from the wallet read; until it answers, the row's own figures (present with wallet:read) stand in.
  const wallet: WalletFigures | undefined = walletRead.data ?? account.wallet ?? undefined;
  const consequence = target
    ? rankConsequence(account.rank, target, wallet, account.security?.hasPassword === true)
    : undefined;

  const submit = dialogSubmit(
    form,
    async () => {
      if (!target) return false;
      try {
        await change.mutateAsync({ account, rank: target, key });
      } catch (error) {
        const found = rankBlockersOf(error);
        if (found.length === 0) throw error;
        // Every reason together, and nothing was written: the person fixes them and tries again with the same key.
        setBlockers(found);
        return false;
      }
    },
    { fields: ['groupId'] },
  );

  return (
    <FormDialog
      open
      title={dialogTitle('rank', [account])}
      confirm="Change rank"
      kind={consequence?.crosses ? 'danger' : 'primary'}
      confirmDisabled={ownerLock.disabled || listLock.disabled}
      onClose={onClose}
      onSubmit={submit}
    >
      <div>
        <FormRow label="Current rank">
          <ReadValue>{currentRankText(account.rank)}</ReadValue>
        </FormRow>
        <SelectField
          layout="row"
          label="New rank"
          selectWrapClassName="w-full"
          disabled={listLock.disabled}
          title={listLock.title}
          hint={listLock.disabled ? listLock.title : undefined}
          options={[
            { value: '', label: query.isLoading ? 'Loading the ranks…' : 'Choose a rank' },
            ...choices.map((rank) => ({ value: String(rank.id), label: rankChoiceLabel(rank) })),
          ]}
          error={errors.groupId}
          {...register('groupId', {
            required: 'Choose the new rank.',
            onChange: () => setBlockers([]),
          })}
        />
        {ownerLock.disabled && <p className="mt-3 text-sm text-crit-fg">{ownerLock.title}</p>}
        {consequence && (
          <div className="mt-3 space-y-1 text-sm text-ink2" aria-label="What will happen" role="group">
            {consequence.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {consequence.warning && <p className="text-crit-fg">{consequence.warning}</p>}
          </div>
        )}
        {blockers.length > 0 && (
          <div className="mt-3 text-sm text-crit-fg" role="alert">
            <p className="font-medium">The rank cannot change yet. Nothing was changed.</p>
            <ul className="mt-1 list-disc ps-5">
              {blockers.map((words) => (
                <li key={words}>{words}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
