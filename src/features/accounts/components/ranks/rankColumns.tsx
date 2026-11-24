// rankColumns: the columns of the Ranks table in the list skin: Rank, Kind, Discount, Credit, Deposit limit, Accounts and the square-pen link to
// the edit view. Pure drawing: nothing here changes a rank.
import { ButtonLink, Icon, type DataTableColumn } from '@/components/ui';
import type { Rank } from '../../types';
import { CreditCell, RankAccountsCell, RankNameCell } from './RankCells';
import { depositText, discountText, editRankPath, kindWord } from './rankList';

/** The columns, in the order of the layout the owner asked for. The name takes the spare width, so the others pack to the right. */
export function rankColumns(): DataTableColumn<Rank>[] {
  return [
    { key: 'name', label: 'Rank', className: 'w-full', render: (rank) => <RankNameCell rank={rank} /> },
    { key: 'kind', label: 'Kind', hide: 'sm', render: (rank) => kindWord(rank) },
    { key: 'discount', label: 'Discount', num: true, render: (rank) => discountText(rank) },
    { key: 'credit', label: 'Credit', hide: 'sm', render: (rank) => <CreditCell rank={rank} /> },
    {
      key: 'deposit',
      label: 'Deposit limit',
      num: true,
      hide: 'md',
      render: (rank) => depositText(rank.depositLimit),
    },
    { key: 'accounts', label: 'Accounts', num: true, render: (rank) => <RankAccountsCell rank={rank} /> },
    {
      key: 'actions',
      label: 'Action',
      className: 'w-px whitespace-nowrap text-right',
      render: (rank) => (
        <ButtonLink
          size="sm"
          variant="ghost"
          icon
          aria-label={`Edit ${rank.name}`}
          title={`Edit ${rank.name}`}
          to={editRankPath(rank.id)}
        >
          <Icon name="squarePen" className="ic-sm" />
        </ButtonLink>
      ),
    },
  ];
}
