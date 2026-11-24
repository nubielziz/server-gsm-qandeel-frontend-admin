// The cells of the Ranks table that hold more than text: the rank's name with its note, the credit square and the number of accounts as a link
// to them. Every figure and every word is the server's; the console only formats.
import { Link } from 'react-router';
import { StatusSquare } from '@/components/ui';
import { isRetailRank } from '../../lib/ranks';
import type { Rank } from '../../types';
import { rankAccountsPath } from './rankList';

const DASH = <span className="text-ink3">–</span>;

/** The rank's name, and under it in small italics what is special about it: the shop's own rank, or the one new merchants start in. */
export function RankNameCell({ rank }: { rank: Rank }) {
  return (
    <>
      <span className="block font-medium">{rank.name}</span>
      {isRetailRank(rank) && <span className="cell-sub">the shop's rank, always there</span>}
      {rank.isDefault && <span className="cell-sub">new merchants start here</span>}
    </>
  );
}

/** A square and a word: "Allowed" (green) when accounts of the rank can have a credit limit, "No" (hollow) when they cannot. */
export function CreditCell({ rank }: { rank: Rank }) {
  const word = rank.overdraftAllowed ? 'Allowed' : 'No';
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusSquare tone={rank.overdraftAllowed ? 'ok' : 'off'} label={word} />
      <span>{word}</span>
    </span>
  );
}

/**
 * How many accounts are in the rank (every account, guests too), as a link to the All view filtered by the rank and the population it
 * belongs to. A rank with none shows a plain 0; a server that sends no count shows a dash.
 */
export function RankAccountsCell({ rank }: { rank: Rank }) {
  if (rank.accountCount === undefined) return DASH;
  if (rank.accountCount === 0) return <>0</>;
  return (
    <Link className="link" to={rankAccountsPath(rank)}>
      {rank.accountCount}
    </Link>
  );
}
