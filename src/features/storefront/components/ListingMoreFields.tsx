// ListingMoreFields: the "More options" fold of the listing editor (decision 036): the delivery note, the position and the two search
// texts. Each keeps its present default and is still sent as before; the fold starts open on a shop page that holds a value of its own
// and stays open while one of its inputs has an error, so nothing wrong is out of sight.
import { MoreOptions, TextField } from '@/components/ui';
import {
  hasCustomMoreOptions,
  isPosition,
  LISTING_LIMITS,
  MAX_SORT,
  moreOptionsHaveError,
  type ListingFieldsProps,
} from '../lib/listingForm';
import type { ServiceListingDetail } from '../types';
import { ListingSeoFields } from './ListingSeoFields';

export interface ListingMoreFieldsProps extends ListingFieldsProps {
  /** The shop page the form was read from: its values decide whether the fold starts open. */
  listing: Pick<ServiceListingDetail, 'etaText' | 'sort' | 'seoTitle' | 'seoDescription'>;
}

/** The fold: delivery note, position, search title and search description. */
export function ListingMoreFields({ register, errors, listing, layout = 'stacked' }: ListingMoreFieldsProps) {
  const row = layout === 'row';
  return (
    <MoreOptions
      className={row ? 'pt-3' : undefined}
      defaultOpen={hasCustomMoreOptions(listing)}
      forceOpen={moreOptionsHaveError(errors)}
    >
      <div className={row ? undefined : 'space-y-3'}>
        <TextField
          label="Delivery note"
          layout={layout}
          autoComplete="off"
          maxLength={LISTING_LIMITS.etaText}
          hint="Empty: the shop shows the service's delivery time. Or write your own, for example “Usually within 24 hours”."
          error={errors.etaText}
          {...register('etaText')}
        />
        <TextField
          label="Position"
          layout={layout}
          inputMode="numeric"
          autoComplete="off"
          hint="Lower numbers come first in the shop."
          error={errors.sort}
          {...register('sort', {
            validate: (value) =>
              isPosition(value) || `Enter a whole number from 0 to ${MAX_SORT.toLocaleString('en-US')}.`,
          })}
        />
        <ListingSeoFields register={register} errors={errors} layout={layout} />
      </div>
    </MoreOptions>
  );
}
