// PinServicesField: the two lists of the pin dialog: the services pinned at a position (1 to 10) and the services hidden from
// the query's results, each with the picker that adds to it. A refusal of one service (for example one with no listed English
// listing) shows on its own row. New in the Search tab.
import { Button, SelectField } from '@/components/ui';
import { MAX_HIDDEN, MAX_PINNED, nextPosition, rowMessage } from '../../lib/search';
import type { HiddenService, PinnedService, ServiceListing } from '../../types';
import { ServicePicker } from './ServicePicker';

const POSITION_OPTIONS = Array.from({ length: MAX_PINNED }, (_, i) => ({
  value: i + 1,
  label: `Position ${i + 1}`,
}));

export interface PinServicesFieldProps {
  pinned: readonly PinnedService[];
  hidden: readonly HiddenService[];
  onPinnedChange: (next: PinnedService[]) => void;
  onHiddenChange: (next: HiddenService[]) => void;
  /** The error trees of the two fields (react-hook-form), for the group message and each row's. */
  pinnedError?: unknown;
  hiddenError?: unknown;
}

/** Edits the pinned and hidden lists. A service is offered in one list only, so it is never pinned and hidden at once. */
export function PinServicesField({
  pinned,
  hidden,
  onPinnedChange,
  onHiddenChange,
  pinnedError,
  hiddenError,
}: PinServicesFieldProps) {
  const chosen = [...pinned.map((p) => p.serviceId), ...hidden.map((h) => h.serviceId)];

  const pin = (listing: ServiceListing) => {
    const position = nextPosition(pinned.map((p) => p.position));
    if (position === null) return;
    onPinnedChange([...pinned, { serviceId: listing.serviceId, position, title: listing.publicTitle }]);
  };
  const hide = (listing: ServiceListing) =>
    onHiddenChange([...hidden, { serviceId: listing.serviceId, title: listing.publicTitle }]);

  return (
    <div className="space-y-4">
      <section aria-label="Pinned services" className="space-y-2">
        <h3 className="label mb-0">
          Pinned first ({pinned.length} of {MAX_PINNED})
        </h3>
        {pinned.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line">
            {pinned.map((item, index) => {
              const problem = rowMessage(pinnedError, index);
              return (
                <li key={item.serviceId} className="px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                    <SelectField
                      aria-label={`Position of ${item.title}`}
                      value={item.position}
                      options={POSITION_OPTIONS}
                      onChange={(event) =>
                        onPinnedChange(
                          pinned.map((p, i) =>
                            i === index ? { ...p, position: Number(event.target.value) } : p,
                          ),
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${item.title} from pinned`}
                      onClick={() => onPinnedChange(pinned.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                  {problem && (
                    <p className="mt-1 text-xs text-crit-fg" role="alert">
                      {problem}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {(pinnedError as { message?: string } | undefined)?.message && (
          <p className="text-xs text-crit-fg" role="alert">
            {(pinnedError as { message?: string }).message}
          </p>
        )}
        <ServicePicker
          label="Find a service to pin"
          verb="Pin"
          exclude={chosen}
          full={pinned.length >= MAX_PINNED}
          onPick={pin}
        />
      </section>
      <section aria-label="Hidden services" className="space-y-2">
        <h3 className="label mb-0">
          Hidden from these results ({hidden.length} of {MAX_HIDDEN})
        </h3>
        {hidden.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line">
            {hidden.map((item, index) => {
              const problem = rowMessage(hiddenError, index);
              return (
                <li key={item.serviceId} className="px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${item.title} from hidden`}
                      onClick={() => onHiddenChange(hidden.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                  {problem && (
                    <p className="mt-1 text-xs text-crit-fg" role="alert">
                      {problem}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ServicePicker
          label="Find a service to hide"
          verb="Hide"
          exclude={chosen}
          full={hidden.length >= MAX_HIDDEN}
          onPick={hide}
        />
      </section>
    </div>
  );
}
