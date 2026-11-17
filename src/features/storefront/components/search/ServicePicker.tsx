// ServicePicker: a search box that offers the listed services matching what is typed, for the pin dialog's "pin" and
// "hide" lists. The server refuses any other service (422), so the menu never shows one. New in the Search tab.
import { useState } from 'react';
import { Button, errorText, SearchInput, Skeleton, useDebouncedCommit } from '@/components/ui';
import { usePinPicker } from '../../hooks/useSearchAdmin';
import type { ServiceListing } from '../../types';

export interface ServicePickerProps {
  /** Placeholder and accessible name of the search box, such as "Find a service to pin". */
  label: string;
  /** What the buttons say before the title: "Pin" or "Hide". */
  verb: string;
  /** Service ids already chosen; they are not offered again. */
  exclude: readonly number[];
  /** True when no more services can be added. */
  full?: boolean;
  onPick: (listing: ServiceListing) => void;
}

/** A debounced search over the listed services, with one button per match. */
export function ServicePicker({ label, verb, exclude, full = false, onPick }: ServicePickerProps) {
  const [committed, setCommitted] = useState('');
  const box = useDebouncedCommit(committed, setCommitted);
  const results = usePinPicker(committed, !full);
  const matches = (results.data ?? []).filter((listing) => !exclude.includes(listing.serviceId));

  return (
    <div className="space-y-1.5">
      <SearchInput
        value={box.text}
        onChange={box.setText}
        placeholder={label}
        disabled={full}
        className="sm:max-w-none"
      />
      {full && <p className="hint">The list is full. Remove a service to add another.</p>}
      {!full && committed.trim() !== '' && (
        <div aria-label={`Matches for ${committed.trim()}`} role="group">
          {results.isLoading ? (
            <Skeleton height={32} />
          ) : results.isError ? (
            <p className="text-xs text-crit-fg" role="alert">
              {errorText(results.error)}
            </p>
          ) : matches.length === 0 ? (
            <p className="hint">No listed service matches. Only listed services can be pinned or hidden.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {matches.map((listing) => (
                <li key={listing.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{listing.publicTitle}</span>
                  <Button
                    size="sm"
                    aria-label={`${verb} ${listing.publicTitle}`}
                    onClick={() => onPick(listing)}
                  >
                    {verb}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
