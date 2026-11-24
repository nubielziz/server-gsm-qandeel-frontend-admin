// StatementSearch: the Quick Search box above the statement: [Wallet] [From] [To] [Search], and, while a merchant wallet is shown, [Download official
// statement]. The Wallet menu applies at once; the two days are drafts until Search or Enter, so the list is not read again at every key; "The end
// is before the start" shows under To and Search waits until the range is the right way round.
import type { FormEvent } from 'react';
import { Button, Icon, LegendBox, SelectField } from '@/components/ui';
import type { StatementWallet } from '../../types';
import type { GrantLock } from '../frame/useAccountGrants';
import { isBackwards, type DateRange } from './walletStatement';

/** The Wallet menu: the live wallet, and the history of each kind an account may have left behind by a rank change. */
const WALLET_OPTIONS: { value: StatementWallet; label: string }[] = [
  { value: 'live', label: 'Live wallet' },
  { value: 'merchant', label: 'Merchant wallet' },
  { value: 'store', label: 'Store balance' },
];

export interface StatementSearchProps {
  /** What the boxes hold now (not yet applied). */
  draft: DateRange;
  onDraft: (range: DateRange) => void;
  /** Search or Enter: apply the draft. */
  onSearch: () => void;
  /** The wallet the statement reads. */
  wallet: StatementWallet;
  onWallet: (wallet: StatementWallet) => void;
  /** The official statement file of the merchant wallet; null while a merchant wallet is not what the statement shows. */
  download: { onDownload: () => void; busy: boolean; lock: GrantLock } | null;
}

/**
 * The box. A day box takes a calendar day; either end may stay empty, which leaves that end open. The Wallet menu is always drawn: a rank
 * change leaves the old wallet's history behind, and nothing in the record says whether an account ever held the other kind, so the server
 * answers (an account that never held it has no lines).
 *
 * @param props see `StatementSearchProps`.
 */
export function StatementSearch({
  draft,
  onDraft,
  onSearch,
  wallet,
  onWallet,
  download,
}: StatementSearchProps) {
  const backwards = isBackwards(draft);
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!backwards) onSearch();
  };
  return (
    <form onSubmit={search} noValidate>
      <LegendBox legend="Quick Search">
        <SelectField
          aria-label="Wallet"
          options={WALLET_OPTIONS}
          value={wallet}
          selectWrapClassName="w-full sm:w-44"
          onChange={(event) => onWallet(event.target.value as StatementWallet)}
        />
        <label className="flex items-center gap-2 text-sm text-ink2">
          From
          <input
            type="date"
            className="input w-40"
            value={draft.from}
            onChange={(event) => onDraft({ ...draft, from: event.target.value })}
          />
        </label>
        <div>
          <label className="flex items-center gap-2 text-sm text-ink2">
            To
            <input
              type="date"
              className="input w-40 aria-[invalid=true]:border-crit-dot"
              value={draft.to}
              aria-invalid={backwards ? true : undefined}
              aria-describedby={backwards ? 'statement-range-error' : undefined}
              onChange={(event) => onDraft({ ...draft, to: event.target.value })}
            />
          </label>
          {backwards && (
            <p id="statement-range-error" className="mt-1 text-xs text-crit-fg" role="alert">
              The end is before the start
            </p>
          )}
        </div>
        <Button type="submit" disabled={backwards}>
          Search
        </Button>
        {download && (
          <Button
            disabled={download.lock.disabled}
            title={download.lock.title}
            loading={download.busy}
            onClick={download.onDownload}
          >
            <Icon name="download" className="ic-sm" />
            Download official statement
          </Button>
        )}
      </LegendBox>
    </form>
  );
}
